// QueryNormalizer — typo-aware query understanding (server-only, deterministic).
//
// Runs BEFORE intent classification and RAG to correct obvious misspellings in
// college-related questions while protecting recognized terms and detecting ambiguous input.
//
// Strategy:
//   1. Protect known college terms/acronyms from correction.
//   2. Compare each word against a college vocabulary using edit distance.
//   3. High-confidence corrections (distance 1-2 with a clear match) → auto-correct.
//   4. Ambiguous corrections → flag for clarification.
//   5. Unrecognized words without college context → leave unchanged (may be out-of-scope).
//   6. Fix basic word-order issues ("How I can" → "How can I").

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QueryNormalizationResult =
  | {
      readonly status: "unchanged";
      readonly originalText: string;
      readonly normalizedText: string;
    }
  | {
      readonly status: "corrected";
      readonly originalText: string;
      readonly normalizedText: string;
      readonly corrections: ReadonlyArray<{ original: string; corrected: string }>;
    }
  | {
      readonly status: "needs_clarification";
      readonly originalText: string;
      readonly ambiguousTerm: string;
    };

// ---------------------------------------------------------------------------
// Protected terms — never autocorrect these
// ---------------------------------------------------------------------------

const PROTECTED_TERMS = new Set([
  "mywesthi lls", // note: we store lowercase for matching
  "mywesthills",
  "cccapply",
  "openccc",
  "eops",
  "care",
  "dsps",
  "calworks",
  "ace",
  "whccd",
  "lemoore",
  "coalinga",
  "parchment",
  "fafsa",
  "seog",
  "pell",
  "calvet",
  "canvas",
  "nc 100",
]);

// ---------------------------------------------------------------------------
// College vocabulary — words that commonly appear in college questions
// ---------------------------------------------------------------------------

const COLLEGE_VOCABULARY: readonly string[] = [
  // Core processes
  "register", "registration", "apply", "application", "enroll", "enrollment",
  "admit", "admissions", "admission", "graduate", "graduation", "transfer",
  // Academics
  "classes", "class", "course", "courses", "semester", "quarter", "credits",
  "units", "major", "minor", "degree", "certificate", "prerequisites",
  "schedule", "catalog", "academic", "calendar",
  // Services
  "tutoring", "tutor", "counseling", "counselor", "advising", "advisor",
  "financial", "aid", "scholarship", "scholarships", "grants", "loans",
  "transcript", "transcripts", "library", "parking", "bookstore",
  // Offices/locations
  "office", "campus", "building", "student", "services", "records",
  "veterans", "portal",
  // Actions
  "contact", "request", "order", "submit", "pay", "cost", "tuition", "fee",
  "fees", "refund", "drop", "withdraw", "add", "deadline",
  // People
  "instructor", "professor", "teacher",
  // Other college terms
  "orientation", "commencement", "probation", "prerequisite",
  "dual", "enrollment", "petition",
  // Accessibility/accommodations
  "accommodation", "accommodations", "disability", "accessibility",
  "accessible", "housing", "testing",
];

// ---------------------------------------------------------------------------
// Edit distance (Levenshtein)
// ---------------------------------------------------------------------------

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

/**
 * Find the best match for a word in the college vocabulary.
 * Returns the match and its edit distance, or null if no close match.
 */
function findBestMatch(word: string): { match: string; distance: number } | null {
  const lower = word.toLowerCase();
  // Exact match → no correction needed.
  if (COLLEGE_VOCABULARY.includes(lower)) return null;

  let best: { match: string; distance: number } | null = null;
  const maxDistance = Math.min(2, Math.floor(lower.length / 3) + 1);

  for (const candidate of COLLEGE_VOCABULARY) {
    // Skip candidates that are too different in length.
    if (Math.abs(candidate.length - lower.length) > maxDistance) continue;
    const dist = editDistance(lower, candidate);
    if (dist > 0 && dist <= maxDistance) {
      if (!best || dist < best.distance) {
        best = { match: candidate, distance: dist };
      }
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Word-order normalization
// ---------------------------------------------------------------------------

/** Fix common word-order issues like "How I can" → "How can I". */
function normalizeWordOrder(text: string): string {
  return text
    .replace(/\bhow i can\b/gi, "how can I")
    .replace(/\bhow i do\b/gi, "how do I")
    .replace(/\bwhere i can\b/gi, "where can I")
    .replace(/\bwhen i can\b/gi, "when can I")
    .replace(/\bwhat i need\b/gi, "what I need");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalize a user query by correcting obvious typos in college-related words.
 *
 * - Protects known college acronyms and proper names.
 * - Corrects words with edit distance ≤ 2 from a college vocabulary term.
 * - Flags ambiguous terms that look like they MIGHT be typos but could also
 *   be intentional (general vocabulary questions, unknown terms).
 * - Fixes basic word-order issues.
 */
export function normalizeQuery(originalText: string): QueryNormalizationResult {
  const trimmed = originalText.trim();
  if (trimmed.length === 0) {
    return { status: "unchanged", originalText: trimmed, normalizedText: trimmed };
  }

  // Fix word order first.
  let working = normalizeWordOrder(trimmed);

  const words = working.split(/\s+/);
  const corrections: Array<{ original: string; corrected: string }> = [];
  const normalizedWords: string[] = [];

  // Determine if the message has college context (other words suggest college topic).
  // Also consider that early corrections may establish context for later words.
  let hasCollegeContext = words.some((w) => {
    const lower = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
    return COLLEGE_VOCABULARY.includes(lower) || PROTECTED_TERMS.has(lower);
  });
  // Also check if any word is a close distance-1 match (strong typo signal).
  if (!hasCollegeContext) {
    hasCollegeContext = words.some((w) => {
      const clean = w.replace(/[^a-zA-Z]/g, "");
      if (clean.length <= 3 || isCommonEnglishWord(clean.toLowerCase())) return false;
      const match = findBestMatch(clean);
      return match !== null && match.distance === 1;
    });
  }

  for (const word of words) {
    const cleanWord = word.replace(/[^a-zA-Z]/g, "");
    const lower = cleanWord.toLowerCase();

    // Skip very short words (articles, prepositions) and empty.
    if (cleanWord.length <= 2) {
      normalizedWords.push(word);
      continue;
    }

    // Skip protected terms.
    if (PROTECTED_TERMS.has(lower)) {
      normalizedWords.push(word);
      continue;
    }

    // Skip words that are already in the vocabulary.
    if (COLLEGE_VOCABULARY.includes(lower)) {
      normalizedWords.push(word);
      continue;
    }

    // Skip common English words that aren't misspelled college terms.
    if (isCommonEnglishWord(lower)) {
      normalizedWords.push(word);
      continue;
    }

    // Only attempt correction if the sentence has college context OR
    // the word is very close (distance 1) to a college term.
    const match = findBestMatch(cleanWord);
    if (match) {
      // High confidence: distance 1 OR (distance 2 AND college context exists).
      const highConfidence = match.distance === 1 || (match.distance === 2 && hasCollegeContext);
      if (highConfidence) {
        const punctuation = word.replace(/[a-zA-Z]+/, "");
        const corrected = match.match + punctuation;
        corrections.push({ original: cleanWord, corrected: match.match });
        normalizedWords.push(corrected);
        continue;
      }
    }

    normalizedWords.push(word);
  }

  const normalizedText = normalizedWords.join(" ");

  // If word order changed but no spelling corrections.
  if (corrections.length === 0 && normalizedText !== trimmed) {
    return {
      status: "corrected",
      originalText: trimmed,
      normalizedText,
      corrections: [{ original: trimmed, corrected: normalizedText }],
    };
  }

  if (corrections.length === 0) {
    return { status: "unchanged", originalText: trimmed, normalizedText: trimmed };
  }

  return {
    status: "corrected",
    originalText: trimmed,
    normalizedText,
    corrections,
  };
}

// ---------------------------------------------------------------------------
// Common English words (not college vocabulary, shouldn't be autocorrected)
// ---------------------------------------------------------------------------

function isCommonEnglishWord(word: string): boolean {
  return COMMON_ENGLISH.has(word);
}

const COMMON_ENGLISH = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
  "was", "one", "our", "out", "day", "get", "has", "him", "his", "how",
  "its", "may", "new", "now", "old", "see", "way", "who", "did", "got",
  "let", "say", "she", "too", "use", "about", "after", "also", "back",
  "been", "call", "come", "could", "each", "find", "first", "from",
  "give", "good", "have", "help", "here", "into", "just", "know",
  "like", "long", "look", "make", "many", "more", "most", "much",
  "need", "only", "over", "some", "take", "tell", "than", "that",
  "them", "then", "they", "this", "time", "very", "want", "well",
  "what", "when", "where", "which", "will", "with", "work", "year",
  "your", "does", "mean", "means", "balloon", "cook", "weather",
  "president", "movie", "game", "world", "country", "city", "food",
  "water", "music", "book", "house", "money", "people", "think",
  "thing", "there", "would", "should", "could", "their", "those",
  "these", "being", "still", "other", "while", "might", "going",
  "never", "every", "really", "something", "anything", "everything",
  "because", "before", "between", "through", "always", "another",
  "without", "different", "important", "someone", "support",
  "emotional", "mental", "personal", "stressed", "overwhelmed",
  "anxious", "feeling", "feel", "talk", "speak", "hurt", "danger",
  // Additional common words that must NOT be autocorrected to college terms.
  "tea", "meet", "meeting", "free", "tree", "three", "feet", "seat",
  "read", "lead", "head", "dead", "said", "paid", "made", "gave",
  "came", "same", "name", "home", "done", "gone", "gone", "life",
  "live", "love", "move", "give", "five", "line", "mine", "fine",
  "wine", "dine", "nine", "fire", "hire", "tire", "wire", "bite",
  "cite", "site", "kite", "late", "date", "rate", "gate", "hate",
  "mate", "fate", "note", "vote", "hope", "rope", "pope", "role",
  "hole", "pole", "sole", "goal", "coal", "road", "load", "boat",
  "coat", "goat", "real", "deal", "heal", "meal", "seal", "steal",
  "team", "dream", "cream", "stream", "clean", "lean", "bean",
  "please", "dragon", "dragons", "quantum", "about", "along",
  "away", "right", "left", "down", "upon", "such", "last", "next",
  "keep", "turn", "start", "show", "play", "run", "set", "try",
  "ask", "put", "hold", "end", "point", "small", "large", "great",
  "high", "low", "big", "own", "same", "open", "close", "full",
  "early", "young", "clear", "sure", "face", "place", "case",
  "part", "field", "hand", "room", "body", "area", "side", "head",
  "door", "plan", "test", "best", "rest", "west", "east", "past",
  "fast", "last", "cost", "lost", "post", "host", "most",
  // Verbs that should never be corrected to college terms
  "offer", "order", "other", "enter", "after", "under", "never",
  "cover", "over", "ever", "even", "given", "taken", "broken",
  "chosen", "frozen", "spoken", "written", "driven", "begin",
  "happen", "listen", "follow", "allow", "provide", "require",
]);
