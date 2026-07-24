// IntentClassifier — route user messages before retrieval (server-only, deterministic).
//
// Classifies incoming messages into one of 7 intents so that simple conversational
// messages (greetings, thanks, goodbye) receive instant friendly responses without
// hitting the RAG pipeline, while college-related questions proceed to retrieval as before.
//
// Design principles:
//   - Modular: new intents can be added by extending the `INTENT_RULES` array.
//   - Deterministic: pure pattern matching, no network calls, no randomness.
//   - Conservative: when in doubt, classify as `college_question` so the RAG pipeline
//     handles it (false negatives are safer than false positives for conversational intents).

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Supported intent categories. Extend this union to add new intents.
 */
export type Intent =
  | "greeting"
  | "thanks"
  | "acknowledgement"
  | "goodbye"
  | "college_question"
  | "follow_up_question"
  | "emotional_support"
  | "urgent_safety"
  | "ambiguous_support"
  | "out_of_scope"
  | "unclear";

/**
 * Result of intent classification. When `requiresRetrieval` is false, the caller should
 * return `response` directly without running the RAG pipeline.
 */
export type IntentClassification = {
  readonly intent: Intent;
  readonly requiresRetrieval: boolean;
  /** Pre-composed response for non-retrieval intents; undefined when retrieval is needed. */
  readonly response?: string;
};

// ---------------------------------------------------------------------------
// Canned responses for conversational intents
// ---------------------------------------------------------------------------

const RESPONSES: Record<Exclude<Intent, "college_question" | "follow_up_question" | "emotional_support">, string> = {
  greeting: "Hi! How can I help you with Lemoore College today?",
  thanks: "You're welcome! Let me know if you have any other questions about Lemoore College.",
  acknowledgement: "Glad I could help! Let me know if you have another question.",
  goodbye: "Goodbye! Feel free to come back if you have more questions about Lemoore College.",
  unclear: "I'm not quite sure what you're looking for. Could you provide a little more detail about your question?",
  out_of_scope: "I'm designed to answer questions about Lemoore College and its official resources. Could you ask me something about admissions, classes, student services, financial aid, or another college-related topic?",
  urgent_safety: "If you or someone you know is in immediate danger, please call 911 or the 988 Suicide and Crisis Lifeline (call or text 988) right now.\n\nFor non-emergency support at Lemoore College, you can reach Student Services:\n\nPhone: (559) 925-3000\nEmail: lemoorehelpdesk@whccd.edu\nHours: Monday–Friday, 8:00 a.m.–5:00 p.m.\nLocation: 555 College Avenue, Building 100",
  ambiguous_support: "I'd like to help you find the right support. Could you let me know a bit more about what you need?\n\nFor example:\n• Academic support (tutoring, writing help, math help)\n• Emotional or mental-health support (counseling, someone to talk to)\n• Financial support (financial aid, scholarships)\n• Technical support (student portal, login issues)",
};

// ---------------------------------------------------------------------------
// Pattern rules (evaluated in order; first match wins)
// ---------------------------------------------------------------------------

type IntentRule = {
  readonly intent: Intent;
  /** Patterns tested against the normalized message. Any match triggers this intent. */
  readonly patterns: readonly RegExp[];
  /** Optional max word count — rule only applies if the message is this short or shorter. */
  readonly maxWords?: number;
};

/**
 * Intent rules evaluated in priority order. Each rule has patterns and an optional
 * word-count gate so that longer messages containing "hi" or "thanks" still route to
 * retrieval (e.g. "hi, how do I apply?" should be a college_question).
 */
const INTENT_RULES: readonly IntentRule[] = [
  {
    intent: "greeting",
    maxWords: 4,
    patterns: [
      /^hi\b/,
      /^hey\b/,
      /^hello\b/,
      /^good\s+(morning|afternoon|evening)\b/,
      /^howdy\b/,
      /^what'?s\s+up\b/,
      /^sup\b/,
      /^yo\b/,
      /^hola\b/,
    ],
  },
  {
    intent: "goodbye",
    maxWords: 4,
    patterns: [
      /^bye\b/,
      /^goodbye\b/,
      /^good\s*bye\b/,
      /^see\s+(you|ya)\b/,
      /^take\s+care\b/,
      /^later\b/,
      /^have\s+a\s+(good|great|nice)\s+(day|one|evening|night)\b/,
    ],
  },
  {
    intent: "thanks",
    maxWords: 6,
    patterns: [
      /^thanks?\b/,
      /^thank\s+you\b/,
      /^thx\b/,
      /^ty\b/,
      /^appreciate\s+it\b/,
      /^much\s+appreciated\b/,
      /^thanks?\s+so\s+much\b/,
      /^thank\s+you\s+(so\s+much|very\s+much)\b/,
    ],
  },
  {
    intent: "acknowledgement",
    maxWords: 4,
    patterns: [
      /^ok(ay)?\b/,
      /^got\s+it\b/,
      /^sounds?\s+good\b/,
      /^perfect\b/,
      /^great\b/,
      /^cool\b/,
      /^alright\b/,
      /^understood\b/,
      /^makes?\s+sense\b/,
      /^nice\b/,
      /^right\b/,
      /^i\s+see\b/,
    ],
  },
  {
    intent: "unclear",
    maxWords: 2,
    patterns: [
      /^help$/,
      /^question$/,
      /^\?+$/,
      /^idk$/,
      /^huh$/,
      /^what$/,
      /^um+$/,
      /^hmm+$/,
    ],
  },
];

// ---------------------------------------------------------------------------
// Follow-up detection heuristics
// ---------------------------------------------------------------------------

/** Patterns that suggest a follow-up to a previous answer rather than a standalone query. */
const FOLLOW_UP_PATTERNS: readonly RegExp[] = [
  /^what\s+about\b/,
  /^how\s+about\b/,
  /^and\s+(what|how|where|when|who)\b/,
  /^what\s+(documents?|else|if)\b/,
  /^how\s+(long|much|many|do\s+i)\b/,
  /^can\s+(i|you)\b/,
  /^is\s+(there|it|that)\b/,
  /^do\s+(i|they|you)\b/,
  /^are\s+there\b/,
];

// ---------------------------------------------------------------------------
// Classification logic
// ---------------------------------------------------------------------------

/** Normalize a message for pattern matching: trim, lowercase, collapse whitespace. */
function normalizeForClassification(message: string): string {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Count words in a normalized message. */
function wordCount(normalized: string): number {
  if (normalized.length === 0) return 0;
  return normalized.split(/\s+/).length;
}

/**
 * Classify a user message into an intent. Deterministic, synchronous, no side effects.
 *
 * Classification strategy:
 *   1. If the message contains a question mark (and isn't just "???"), treat it as a
 *      question that should go through retrieval — skip conversational pattern matching.
 *   2. Check conversational intents (greeting, goodbye, thanks, acknowledgement, unclear)
 *      — only match if the message is short enough (maxWords gate prevents false matches
 *      on messages like "hi, how do I apply for financial aid?").
 *   3. Check follow-up patterns for short questions that reference prior context.
 *   4. Default to `college_question` — the RAG pipeline handles everything else.
 */
export function classifyIntent(message: string): IntentClassification {
  const normalized = normalizeForClassification(message);
  const words = wordCount(normalized);

  // Empty / whitespace-only message → unclear.
  if (normalized.length === 0) {
    return { intent: "unclear", requiresRetrieval: false, response: RESPONSES.unclear };
  }

  // Messages containing a question mark are likely questions — skip conversational
  // matching (except for the "unclear" patterns like pure "???").
  const hasQuestion = normalized.includes("?") && !/^\?+$/.test(normalized);

  // Check conversational intent rules (order matters — first match wins).
  if (!hasQuestion) {
    for (const rule of INTENT_RULES) {
      if (rule.maxWords !== undefined && words > rule.maxWords) continue;
      for (const pattern of rule.patterns) {
        if (pattern.test(normalized)) {
          const response = RESPONSES[rule.intent as keyof typeof RESPONSES];
          return { intent: rule.intent, requiresRetrieval: false, response };
        }
      }
    }
  } else {
    // Still allow the "unclear" patterns to match (e.g. "???").
    const unclearRule = INTENT_RULES.find((r) => r.intent === "unclear");
    if (unclearRule && (!unclearRule.maxWords || words <= unclearRule.maxWords)) {
      for (const pattern of unclearRule.patterns) {
        if (pattern.test(normalized)) {
          return { intent: "unclear", requiresRetrieval: false, response: RESPONSES.unclear };
        }
      }
    }
  }

  // --- Urgent safety: immediate danger, self-harm, crisis ---
  // Must be checked BEFORE everything else (except conversational greetings).
  if (isUrgentSafety(normalized)) {
    return { intent: "urgent_safety", requiresRetrieval: false, response: RESPONSES.urgent_safety };
  }

  // --- Emotional support: mental health, counseling, wellbeing ---
  // These go to retrieval but with topic filtering (only counseling sources).
  if (isEmotionalSupport(normalized)) {
    return { intent: "emotional_support", requiresRetrieval: true };
  }

  // --- Ambiguous counseling: "I need counseling" without emotional/academic context ---
  if (isAmbiguousCounseling(normalized)) {
    return {
      intent: "ambiguous_support",
      requiresRetrieval: false,
      response: "Are you looking for academic counseling (course planning, degree requirements, transfer guidance), or emotional and mental-health support (personal counseling, someone to talk to about how you're feeling)?",
    };
  }

  // --- Out of scope: clearly non-college questions ---
  if (isOutOfScope(normalized)) {
    return { intent: "out_of_scope", requiresRetrieval: false, response: RESPONSES.out_of_scope };
  }

  // --- Gibberish / unintelligible input ---
  if (isGibberish(normalized)) {
    return { intent: "unclear", requiresRetrieval: false, response: RESPONSES.unclear };
  }

  // Check follow-up patterns — but only if the message has college relevance.
  // "How do I cook pasta?" should not be treated as a follow-up question.
  if (hasCollegeRelevance(normalized)) {
    for (const pattern of FOLLOW_UP_PATTERNS) {
      if (pattern.test(normalized)) {
        return { intent: "follow_up_question", requiresRetrieval: true };
      }
    }
  }

  // --- Ambiguous support: just "I need support" without context ---
  if (isAmbiguousSupport(normalized)) {
    return { intent: "ambiguous_support", requiresRetrieval: false, response: RESPONSES.ambiguous_support };
  }

  // --- Ambiguous multi-meaning terms: need clarification before retrieval ---
  const ambiguousResult = detectAmbiguousTerm(normalized);
  if (ambiguousResult) {
    return { intent: "unclear", requiresRetrieval: false, response: ambiguousResult };
  }

  // --- College-topic relevance gate ---
  // Only proceed to RAG if the message plausibly relates to a college topic.
  // Messages with no college-related terms get out_of_scope.
  if (!hasCollegeRelevance(normalized) && words > 3) {
    return { intent: "out_of_scope", requiresRetrieval: false, response: RESPONSES.out_of_scope };
  }

  // Default: treat as a college question → run the RAG pipeline.
  return { intent: "college_question", requiresRetrieval: true };
}

// ---------------------------------------------------------------------------
// Emotional support & safety detection
// ---------------------------------------------------------------------------

/** Detect messages indicating immediate danger, self-harm, or crisis. */
function isUrgentSafety(normalized: string): boolean {
  return /\b(hurt myself|kill myself|end my life|don'?t want to live|want to die|suicide|self[- ]harm|harm myself|in immediate danger|might hurt|mental[- ]health emergency)\b/.test(normalized);
}

/** Detect messages requesting emotional/mental-health support (not academic). */
function isEmotionalSupport(normalized: string): boolean {
  // Explicit emotional/mental-health language (unambiguously emotional).
  if (/\b(emotional support|mental health|mental-health|therapist|therapy|psycholog|wellbeing|well-being|wellness)\b/.test(normalized)) {
    return true;
  }
  // "Counseling" or "counselor" with emotional qualifiers.
  if (/\b(counseling|counselor)\b/.test(normalized) &&
      /\b(emotional|mental|personal|stress|anxi|depress|wellbeing|well-being|crisis)\b/.test(normalized)) {
    return true;
  }
  // Feelings + need for support (not academic).
  if (/\b(feel|feeling|i'?m)\b/.test(normalized) &&
      /\b(overwhelmed|anxious|anxiet|depressed|stressed|lonely|hopeless|lost|scared|sad|down|struggling)\b/.test(normalized)) {
    return true;
  }
  // "I need someone to talk to" / "I need to talk to someone"
  if (/\bneed\s+(someone|somebody)\s+to\s+talk\b/.test(normalized)) return true;
  if (/\bneed\s+to\s+talk\s+to\s+(someone|somebody)\b/.test(normalized)) return true;
  // "I'm having a difficult/hard/tough time"
  if (/\bhaving\s+a\s+(difficult|hard|tough|rough|bad)\s+time\b/.test(normalized)) return true;
  // "I need help with my mental health"
  if (/\bneed\s+help\s+with\s+(my\s+)?(mental|emotional)\b/.test(normalized)) return true;

  return false;
}

/**
 * Detect ambiguous counseling requests that could mean academic OR emotional support.
 * These need a clarifying question before routing.
 */
function isAmbiguousCounseling(normalized: string): boolean {
  // Only ambiguous for short, unqualified requests — not specific action questions.
  // "How do I meet with a counselor?" is specific (action: "meet") → not ambiguous.
  if (/\b(meet|schedule|appointment|make|book|find|see|speak|talk)\b/.test(normalized)) return false;
  // "I need counseling" / "Can I speak to a counselor?" without emotional/academic qualifiers.
  if (/\b(counseling|counselor)\b/.test(normalized) &&
      !/\b(emotional|mental|personal|stress|anxi|depress|academic|career|transfer|degree|class|course)\b/.test(normalized)) {
    return true;
  }
  return false;
}

/**
 * Detect ambiguous "I need support" without clear academic or emotional context.
 * Only matches very short, unqualified support requests.
 */
function isAmbiguousSupport(normalized: string): boolean {
  // "I need support" / "I need help" without qualification.
  const words = normalized.split(/\s+/).length;
  if (words > 5) return false; // Longer messages have enough context.
  return /^i\s+need\s+(support|help)\.?$/.test(normalized);
}

// ---------------------------------------------------------------------------
// Ambiguous multi-meaning term detection
// ---------------------------------------------------------------------------

/**
 * Terms that have multiple meanings in a college context and require clarification
 * UNLESS the message already contains a qualifying word that disambiguates.
 */
const AMBIGUOUS_TERMS: ReadonlyArray<{
  /** Pattern to detect the ambiguous term. */
  pattern: RegExp;
  /** If any of these qualifiers are present, the term is disambiguated — don't ask. */
  qualifiers: RegExp;
  /** The clarification question to ask. */
  clarification: string;
}> = [
  {
    pattern: /\baccommodation|accommodations?\b/i,
    qualifiers: /\b(disability|disabilit|accessible|dsps|testing|test|exam|housing|residence|dorm|classroom|academic)\b/i,
    clarification: "Are you asking about disability or classroom accommodations, testing accommodations, or student housing?",
  },
];

/**
 * Check if the message contains an ambiguous multi-meaning term without a qualifier.
 * Returns the clarification question if ambiguous, or null if the meaning is clear.
 */
function detectAmbiguousTerm(normalized: string): string | null {
  for (const entry of AMBIGUOUS_TERMS) {
    if (entry.pattern.test(normalized) && !entry.qualifiers.test(normalized)) {
      return entry.clarification;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Out-of-scope & gibberish detection
// ---------------------------------------------------------------------------

/** Patterns that indicate clearly non-college questions. */
function isOutOfScope(normalized: string): boolean {
  // General knowledge / vocabulary questions.
  if (/\b(what does .+ mean|what .+ means|define |definition of|translate)\b/.test(normalized) &&
      !hasCollegeRelevance(normalized)) {
    return true;
  }
  // Clearly non-college topics.
  if (/\b(cook|recipe|weather|president of|capital of|movie|song|lyrics|game|sports score|stock price|cryptocurrency)\b/.test(normalized)) {
    return true;
  }
  // "Tell me about [non-college topic]" without college context.
  if (/^tell me about\b/.test(normalized) && !hasCollegeRelevance(normalized)) {
    return true;
  }
  // "Who is [person]" questions (non-college).
  if (/^who (is|was|are)\b/.test(normalized) && !hasCollegeRelevance(normalized)) {
    return true;
  }
  return false;
}

/** Detect gibberish or unintelligible input. */
function isGibberish(normalized: string): boolean {
  const clean = normalized.replace(/[^a-z]/g, "");
  if (clean.length === 0) return true;
  // Single word with no recognizable pattern and consonant clusters.
  const words = normalized.split(/\s+/);
  if (words.length === 1 && clean.length >= 4) {
    // Check for excessive consonant clusters (4+ consonants in a row).
    if (/[bcdfghjklmnpqrstvwxyz]{4,}/.test(clean)) return true;
    // Very low vowel ratio (less than 20% vowels in a word of 5+ chars).
    if (clean.length >= 5) {
      const vowels = (clean.match(/[aeiou]/g) ?? []).length;
      if (vowels / clean.length < 0.2) return true;
    }
  }
  // Multi-word but all words are short gibberish.
  if (words.length <= 2 && clean.length <= 8 &&
      !/\b(hi|hey|ok|the|is|are|do|i|a|to|my|me|it|no|yes|how|who|what|can|get|help)\b/.test(normalized)) {
    if (/[bcdfghjklmnpqrstvwxyz]{4,}/.test(clean)) return true;
  }
  return false;
}

/**
 * Check whether the message plausibly relates to a college topic.
 * Uses keyword matching for common college terms. Misspellings are handled
 * by checking approximate patterns (e.g. "regist" matches "register/registration").
 */
function hasCollegeRelevance(normalized: string): boolean {
  // Use partial word patterns to catch misspellings and word variants.
  return /\b(lemoore|college|whccd|class|classes|clasess|course|regist|regster|enroll|admiss|apply|applic|tuition|fees?|financial|aid|fafsa|scholarship|transcript|tutor|counsel|graduat|degree|diploma|transfer|major|minor|student|portal|campus|library|calendar|semester|veteran|dual enrollment|eops|dsps|schedule|parking|bookstore|cafeteria|office|math|english|writing|reading|assignment|homework|gpa|credit|unit|attendance|cost|academ|drop date|census|withdraw|add date|refund|mywesthills|mywesth|cccapply|openccc|canvas|parchment|access|accommodation|accommodations|disability|testing|housing)/i.test(normalized);
}
