// ConversationRewriter — expand follow-up questions into standalone search queries.
//
// When a user asks a follow-up question that depends on prior conversation context
// (e.g. "How much does it cost?" after asking about transcripts), this module rewrites
// the query into a self-contained form suitable for retrieval ("How much does it cost
// to order an official transcript at Lemoore College?").
//
// The rewriter:
//   - Preserves the user's original intent exactly.
//   - Only adds contextual information from prior turns — never invents facts.
//   - Does NOT answer the question or change its meaning.
//   - Returns the original query unchanged if it is already standalone.
//
// Implementation: deterministic, rule-based heuristics (no LLM call). Detects pronoun
// references and short questions that lack a clear topic, then injects the topic from
// the most recent prior question.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single turn in the conversation (user question + optional assistant answer). */
export type ConversationTurn = {
  readonly question: string;
  readonly answer?: string;
};

/** Result of the rewriting step. */
export type RewriteResult = {
  /** The query to send to retrieval (may be the original or a rewritten version). */
  readonly searchQuery: string;
  /** Whether the query was rewritten (true) or passed through unchanged (false). */
  readonly wasRewritten: boolean;
  /** The original user message before rewriting. */
  readonly originalQuery: string;
};

// ---------------------------------------------------------------------------
// Heuristics for detecting follow-up queries
// ---------------------------------------------------------------------------

/** Patterns indicating the message likely refers to something from a prior turn. */
const FOLLOW_UP_INDICATORS: readonly RegExp[] = [
  /^(what|how|where|when|who|which|is|are|can|do|does|will|would)\s+(about|if)\b/i,
  /^(and|but|also|what about)\b/i,
  /\b(it|that|this|those|these|they|them|the same)\b/i,
  /^(how much|how long|how many|how do i|how can i|can i|do i|is there)\b/i,
  /^(what|which)\s+(documents?|forms?|steps?|requirements?|options?)\b/i,
];

/** Questions that are likely standalone (contain enough topic context already). */
const STANDALONE_INDICATORS: readonly RegExp[] = [
  /\b(lemoore|college|whccd)\b/i,
  /\b(financial aid|fafsa|scholarship|tuition|registration|admissions?|transcript|counseling|tutoring|parking|library|veterans?|eops|dsps|dual enrollment)\b/i,
  /\b(apply|enroll|register|graduate|transfer)\b.*\b(college|school|class|program)\b/i,
];

/** Very short queries (1-5 words without a clear subject) are likely follow-ups. */
const SHORT_QUERY_MAX_WORDS = 5;

// ---------------------------------------------------------------------------
// Topic extraction from prior turns
// ---------------------------------------------------------------------------

/**
 * Topic extracted from a prior question. Can be either:
 * - A noun phrase (e.g. "financial aid", "parking", "the transcript")
 * - A verb phrase (e.g. "apply to Lemoore College", "register for classes")
 */
type ExtractedTopic = {
  readonly text: string;
  readonly kind: "noun" | "verb";
};

/** Extract the main topic/subject from a prior question for injection into the follow-up. */
function extractTopic(priorQuestion: string): ExtractedTopic | null {
  const normalized = priorQuestion.trim().replace(/[?!.]+$/, "").trim();

  // Verb-phrase patterns: "How do I {verb phrase}?"
  const verbPatterns: readonly RegExp[] = [
    /(?:how (?:do|can|would) (?:i|you|we|students?))\s+(.+)/i,
    /(?:where can (?:i|you|we|students?))\s+(.+)/i,
    /(?:how to)\s+(.+)/i,
    /(?:i need|i want)(?: to)?\s+(.+)/i,
  ];

  for (const pattern of verbPatterns) {
    const match = pattern.exec(normalized);
    if (match?.[1]) {
      return { text: match[1].trim(), kind: "verb" };
    }
  }

  // Noun-phrase patterns: "Tell me about {noun}", "What is {noun}?"
  const nounPatterns: readonly RegExp[] = [
    /(?:tell me about|what (?:is|are)|when (?:is|are|do|does))\s+(.+)/i,
    /(?:where (?:is|are))\s+(.+)/i,
    /(?:how much (?:is|does|do))\s+(.+)/i,
    /(?:what are the|what is the)\s+(.+)/i,
  ];

  for (const pattern of nounPatterns) {
    const match = pattern.exec(normalized);
    if (match?.[1]) {
      return { text: match[1].trim(), kind: "noun" };
    }
  }

  // Fallback: if the prior question is short enough, use it as noun context.
  const words = normalized.split(/\s+/);
  if (words.length <= 6) {
    return { text: normalized, kind: "noun" };
  }

  return null;
}

/**
 * Determine whether a query needs rewriting based on its content and conversation context.
 */
function needsRewriting(query: string, history: readonly ConversationTurn[]): boolean {
  // No history → nothing to inject.
  if (history.length === 0) return false;

  // If the query already mentions a specific Lemoore topic, it's standalone.
  for (const pattern of STANDALONE_INDICATORS) {
    if (pattern.test(query)) return false;
  }

  // Check for follow-up language patterns.
  for (const pattern of FOLLOW_UP_INDICATORS) {
    if (pattern.test(query)) return true;
  }

  // Very short questions without a clear subject are likely follow-ups.
  const wordCount = query.trim().split(/\s+/).length;
  if (wordCount <= SHORT_QUERY_MAX_WORDS) return true;

  return false;
}

/**
 * Rewrite the query by injecting topic context from the most recent prior turn.
 * Uses the topic kind (noun vs verb) to produce natural phrasing.
 */
function rewriteWithContext(query: string, topic: ExtractedTopic): string {
  const trimmed = query.trim().replace(/[?]+$/, "").trim();
  const t = topic.text.toLowerCase();

  // Check if topic already mentions "lemoore" to avoid duplication.
  const hasLemoore = /lemoore/i.test(t);
  const suffix = hasLemoore ? "" : " at Lemoore College";

  // Helper: produce "to {verb}" or "for/about {noun}" depending on topic kind.
  const contextPhrase = topic.kind === "verb" ? `to ${t}` : `for ${t}`;

  // Convert verb to gerund for use as a subject (e.g. "park" → "parking").
  const gerund = t.replace(/e$/, "") + "ing";
  const nounForm = topic.kind === "verb" ? gerund : t;

  // Pattern: "How much does it cost?" → "How much does it cost to {verb}?"
  if (/^how much/i.test(trimmed)) {
    return `${trimmed} ${contextPhrase}${suffix}?`;
  }

  // Pattern: "Is it free?" → "Is {noun/gerund} free?"
  if (/^is\s+(it|that|this)\b/i.test(trimmed)) {
    const rest = trimmed.replace(/^is\s+(it|that|this)\s*/i, "").trim();
    return `Is ${nounForm} ${rest}${suffix}?`;
  }

  // Pattern: "How long does it take?" → "How long does it take to {verb}?"
  if (/^how long/i.test(trimmed)) {
    return `${trimmed} ${contextPhrase}${suffix}?`;
  }

  // Pattern: "What documents do I need?" → "What documents do I need to {verb}?"
  if (/^what\s+(documents?|forms?|steps?|requirements?)/i.test(trimmed)) {
    return `${trimmed} ${contextPhrase}${suffix}?`;
  }

  // Pattern: "What are the eligibility requirements?" → "What are the ... for {noun}?"
  if (/^what are the/i.test(trimmed)) {
    return `${trimmed} ${contextPhrase}${suffix}?`;
  }

  // Pattern: "Can I do it online?" → "Can I {verb} online?"
  if (/^can\s+i\b/i.test(trimmed)) {
    if (topic.kind === "verb") {
      const rest = trimmed
        .replace(/^can\s+i\s*/i, "")
        .replace(/\b(do\s+)?(it|that|this)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      return `Can I ${t} ${rest}${suffix}?`;
    }
    const rest = trimmed.replace(/^can\s+i\s*/i, "").replace(/\b(it|that|this)\b/gi, t).replace(/\s+/g, " ").trim();
    return `Can I ${rest}${suffix}?`;
  }

  // Pattern: "Do I need ...?" → "Do I need ... to {verb}?"
  if (/^do\s+i\b/i.test(trimmed)) {
    return `${trimmed} ${contextPhrase}${suffix}?`;
  }

  // Pattern: "What about {x}?" → "{x} for {topic}?"
  if (/^what about\b/i.test(trimmed)) {
    const rest = trimmed.replace(/^what about\s*/i, "").trim();
    return `${rest} ${contextPhrase}${suffix}?`;
  }

  // Pattern: "And {x}?" or "But {x}?" → "{x} for {topic}?"
  if (/^(and|but|also)\b/i.test(trimmed)) {
    const rest = trimmed.replace(/^(and|but|also)\s*/i, "").trim();
    return `${rest} ${contextPhrase}${suffix}?`;
  }

  // Generic: append context.
  return `${trimmed} ${contextPhrase}${suffix}?`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Rewrite a user query into a standalone search query using conversation history.
 *
 * If the query is already standalone or there is no useful context in the history,
 * returns the original query unchanged. Otherwise, injects topic context from the
 * most recent prior turn to make the query self-contained for retrieval.
 */
export function rewriteForConversation(
  query: string,
  history: readonly ConversationTurn[],
): RewriteResult {
  const trimmed = query.trim();

  // No history or query doesn't need rewriting → pass through.
  if (!needsRewriting(trimmed, history)) {
    return { searchQuery: trimmed, wasRewritten: false, originalQuery: trimmed };
  }

  // Extract topic from the most recent prior question.
  const lastTurn = history[history.length - 1];
  if (!lastTurn) {
    return { searchQuery: trimmed, wasRewritten: false, originalQuery: trimmed };
  }

  const topic = extractTopic(lastTurn.question);
  if (!topic) {
    return { searchQuery: trimmed, wasRewritten: false, originalQuery: trimmed };
  }

  // Rewrite the query with injected context.
  const searchQuery = rewriteWithContext(trimmed, topic);
  return { searchQuery, wasRewritten: true, originalQuery: trimmed };
}
