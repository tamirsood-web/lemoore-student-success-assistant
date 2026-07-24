// GroundedAnswerGenerator — compose a natural, conversational answer from retrieved evidence.
//
// Produces answers that sound like a helpful college staff member while keeping EVERY
// factual detail grounded in the official corpus. The generator:
//
//   1. Gathers all relevant chunks from top-ranked pages (not just the single best chunk).
//   2. Organizes information logically — direct answer first, then supporting details.
//   3. Rewrites structural glue (transitions, introductions) while preserving factual content.
//   4. Appends inline citation markers so source attribution remains intact.
//
// Correctness guarantee: no factual claim can appear in the output that is not present in
// the ranked source chunks. Only connective/transitional language is generated; all facts
// (dates, names, numbers, locations, policies) come verbatim from the evidence.

import type { RankedSource } from "./reranker";
import { formatAnswer } from "./answerFormatter";

export type GroundedAnswer = {
  /** Natural conversational answer with inline citation markers, e.g. "[1]". */
  readonly answer: string;
  /** The pages actually cited, in citation order (index 0 -> "[1]"). */
  readonly citedSources: readonly RankedSource[];
};

/** Maximum number of pages cited inline for a single answer. */
const MAX_CITED = 3;

/** Maximum number of chunks to incorporate from a single page. */
const MAX_CHUNKS_PER_PAGE = 4;

// ---------------------------------------------------------------------------
// Text utilities
// ---------------------------------------------------------------------------

/** Normalize whitespace in a text fragment. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Split text into sentences (rough but effective for this corpus). */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Check if a sentence looks like a "marketing opener" we can drop or rephrase. */
function isMarketingOpener(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return (
    lower.startsWith("what are you waiting for") ||
    lower.startsWith("it's free to apply") ||
    lower.startsWith("classes around your schedule") ||
    lower.startsWith("find the classes you need")
  );
}

/** Check if a sentence contains contact/location details (as presented information, not merely mentioning). */
function isContactInfo(sentence: string): boolean {
  // Actual phone number pattern (the number itself, not just the word "phone").
  if (/\(\d{3}\)\s*\d{3}[-.]\d{4}/.test(sentence)) return true;

  // Email address pattern (actual address, not just the word "email").
  if (/\b[\w.-]+@[\w.-]+\.\w{2,}\b/.test(sentence)) return true;

  // Explicit labeled contact fields: "Phone:", "Email:", "Hours:", "Office:", "Location:"
  if (/\b(phone|email|hours|office|location|fax)\s*:/i.test(sentence)) return true;

  // Location sentences: "located at/in", "situated in/at"
  if (/\b(located|situated)\s+(at|in)\b/i.test(sentence)) return true;

  // Business hours with day patterns: "Mon-Fri", "Monday-Friday", "Open Mon"
  if (/\b(mon[- ]?fri|monday\s*[-–]\s*friday|open\s+mon)/i.test(sentence)) return true;

  // "Hours are" or "Hours:" patterns
  if (/\bhours\s+(are|:)/i.test(sentence)) return true;

  // "Contact [Name]" pattern (explicit contact instruction)
  if (/^contact\s+[A-Z]/i.test(sentence)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Answer composition
// ---------------------------------------------------------------------------

/** Tokenize query for chunk relevance scoring. Filters common stopwords. */
function tokenizeQuery(query: string): Set<string> {
  const STOPWORDS = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such", "no",
    "not", "only", "own", "same", "so", "than", "too", "very", "just",
    "because", "but", "and", "or", "if", "while", "about", "what", "which",
    "who", "whom", "this", "that", "these", "those", "am", "its", "my",
    "your", "his", "her", "our", "their", "me", "him", "them", "i", "you",
    "he", "she", "it", "we", "they",
  ]);
  return new Set(
    query
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

/** Score a chunk's relevance to the query (number of matching terms). */
function chunkRelevance(chunkText: string, queryTerms: Set<string>): number {
  const words = new Set(chunkText.toLowerCase().split(/\W+/));
  let score = 0;
  for (const term of queryTerms) {
    if (words.has(term)) score++;
  }
  return score;
}

/**
 * Gather ONLY relevant chunks from a page. Uses query terms plus the page's
 * matched terms (from the reranker) to determine relevance. A chunk is relevant
 * if it shares at least one content term with the query OR with the page's
 * topic/title match. Falls back to the bestChunk if no chunks score.
 */
function gatherRelevantChunks(page: RankedSource, query: string): string[] {
  const source = page.source;
  const queryTerms = tokenizeQuery(query);

  // Also include the page's matched terms from the reranker —
  // these represent why this page ranked (topic, title, department matches).
  for (const term of page.matchedTerms) {
    if (term.length > 2) queryTerms.add(term);
  }

  if (queryTerms.size === 0) {
    return [normalize(page.bestChunk.text)];
  }

  // Score each chunk for relevance.
  const scored = source.chunks.map((chunk) => ({
    text: normalize(chunk.text),
    relevance: chunkRelevance(chunk.text, queryTerms),
    id: chunk.id,
  }));

  // Keep only chunks with relevance > 0.
  const relevant = scored.filter((c) => c.relevance > 0);

  if (relevant.length === 0) {
    return [normalize(page.bestChunk.text)];
  }

  // Sort by relevance (highest first), take up to MAX_CHUNKS_PER_PAGE.
  relevant.sort((a, b) => b.relevance - a.relevance);
  return relevant.slice(0, MAX_CHUNKS_PER_PAGE).map((c) => c.text);
}

/**
 * Detect the user's answer intent — what specific type of information they want.
 * This is more granular than the format detection; it identifies the exact answer type.
 */
type AnswerIntent =
  | "list_types"     // "what types/forms/kinds exist?"
  | "process"        // "how do I apply/register/submit?"
  | "contact"        // "how do I contact/reach/where is the office?"
  | "eligibility"    // "who is eligible/what are the requirements?"
  | "cost"           // "how much does it cost?"
  | "general";       // everything else

function detectAnswerIntent(query: string): AnswerIntent {
  const q = query.toLowerCase();

  // Contact intent: asking for contact details specifically
  if (/\b(how do i contact|how can i contact|how can i reach|phone number|where is the .* office|where can i get)\b/.test(q)) {
    return "contact";
  }

  // Process intent: asking how to do something
  if (/\b(how do i|how can i|how to|steps to)\b/.test(q) &&
      /\b(apply|register|enroll|submit|sign up|complete|order|request|get started)\b/.test(q)) {
    return "process";
  }

  // List-types intent: asking what categories/types/forms exist
  if (/\b(what (forms?|types?|kinds?|categories|options))\b/.test(q) ||
      /\b(what .* (exist|available|offered|provide))\b/.test(q) ||
      /\b(list of|types of)\b/.test(q)) {
    return "list_types";
  }

  // Eligibility intent: asking about who qualifies
  if (/\b(who (is|can|qualif)|eligib|requirement|do i need|what do i need|qualify)\b/.test(q)) {
    return "eligibility";
  }

  // Cost intent
  if (/\b(how much|cost|fee|tuition|price|pay)\b/.test(q)) {
    return "cost";
  }

  return "general";
}

/** Check if a sentence describes a process/steps. */
function isProcessSentence(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return /\b(step|submit|complete|enter|create|verify|fill|apply|sign|provide|first|then|next|application)\b/.test(lower) &&
    /\b(you|your|the|an?)\b/.test(lower);
}

/** Check if a sentence lists types/categories/forms of something. */
function isTypesListSentence(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  // Must describe categories/kinds, not an application form or process step.
  if (isProcessSentence(sentence)) return false;
  return /\b(include|includes|including|such as|types?|categories|grants?|scholarships?|loans?|from .* to|work[- ]study)\b/.test(lower);
}

/** Check if a sentence describes eligibility/requirements. */
function isEligibilitySentence(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return /\b(eligible|eligibility|must|required|qualify|need-based|criteria|requirement)\b/.test(lower);
}

/**
 * Filter sentences based on the user's answer intent.
 * Keeps only sentences that address what the user actually asked for.
 * Returns the filtered arrays; falls back to original if filtering removes everything.
 */
function filterByIntent(
  body: string[],
  contact: string[],
  intent: AnswerIntent,
): { body: string[]; contact: string[]; includeContact: boolean } {
  switch (intent) {
    case "contact": {
      // User wants contact info — keep minimal intro body, prioritize contact.
      // Keep only 1-2 introductory/descriptive body sentences.
      const introBody = body.filter((s) => !isProcessSentence(s)).slice(0, 1);
      return { body: introBody, contact, includeContact: true };
    }

    case "process": {
      // User wants steps — keep only sentences that describe actions/steps in the process.
      const processBody = body.filter((s) => {
        if (isProcessSentence(s)) return true;
        // Keep sentences describing what must happen or outcomes.
        if (/\b(must|will receive|should receive|you will|request|order|use|send|mail|deliver|free|printed|involves|steps?)\b/i.test(s)) return true;
        return false;
      });
      // If filtering found process content, use it. Otherwise fall back to all body.
      const filtered = processBody.length > 0 ? processBody : body;
      return { body: filtered, contact: [], includeContact: false };
    }

    case "list_types": {
      // User wants types/categories — keep sentences that list forms of the topic.
      const typesBody = body.filter((s) => isTypesListSentence(s) || body.indexOf(s) === 0);
      const filtered = typesBody.length > 0 ? typesBody : body.filter((s) => !isProcessSentence(s));
      return { body: filtered.slice(0, 4), contact: [], includeContact: false };
    }

    case "eligibility": {
      // User wants eligibility info — keep eligibility sentences.
      const eligBody = body.filter((s) => isEligibilitySentence(s) || body.indexOf(s) === 0);
      const filtered = eligBody.length > 0 ? eligBody : body.filter((s) => !isProcessSentence(s));
      return { body: filtered.slice(0, 4), contact: [], includeContact: false };
    }

    case "cost": {
      // User wants cost info — keep cost-related sentences.
      const costBody = body.filter((s) => /(\$|cost|fee|free|per\s|tuition|charge|\d+\.\d{2})/.test(s) || body.indexOf(s) === 0);
      const filtered = costBody.length > 0 ? costBody : body;
      return { body: filtered, contact: [], includeContact: false };
    }

    case "general":
    default:
      // General: include everything, contact only if useful.
      return { body, contact, includeContact: contact.length > 0 };
  }
}

/**
 * Compose a formatted answer by:
 * - Filtering marketing/promotional openers that add no information
 * - Separating contact details from body content
 * - Filtering by answer intent to only include relevant sentences
 * - Applying adaptive formatting based on the user's question type
 *
 * Every sentence in the output is drawn from the source chunks.
 */
function composeFromChunks(
  sentences: string[],
  citationMarker: string,
  query: string,
): string {
  const body: string[] = [];
  const contact: string[] = [];

  for (const sentence of sentences) {
    if (isMarketingOpener(sentence)) continue;
    if (isContactInfo(sentence)) {
      contact.push(sentence);
    } else {
      body.push(sentence);
    }
  }

  // Apply intent-based filtering to only include relevant sentences.
  const intent = detectAnswerIntent(query);
  const filtered = filterByIntent(body, contact, intent);

  // Fallback: if everything was filtered, use whatever we have.
  if (filtered.body.length === 0 && !filtered.includeContact) {
    // Use original body if filtering was too aggressive.
    const fallbackBody = body.length > 0 ? body.slice(0, 3) : [sentences[0] ?? ""];
    const formatted = formatAnswer({ query, body: fallbackBody, contact: [] });
    return `${formatted} ${citationMarker}`;
  }

  // Apply adaptive formatting using only the filtered sentences.
  const finalContact = filtered.includeContact ? filtered.contact : [];
  const formatted = formatAnswer({ query, body: filtered.body, contact: finalContact });

  return `${formatted} ${citationMarker}`;
}

/**
 * Check if a supplementary source is topically related to the primary source.
 * Only sources about the same subject should contribute content to the answer.
 * This is deliberately strict — unrelated sources show in "Related Pages" instead.
 */
function isTopicallyRelated(primary: RankedSource, secondary: RankedSource): boolean {
  // Same topic → definitely related (e.g. both about "financial-aid").
  if (primary.source.topic === secondary.source.topic) return true;

  // Generic institution terms that appear on every page — not topically meaningful.
  const GENERIC_TERMS = new Set([
    "lemoore", "college", "whccd", "west", "hills", "student", "students",
    "campus", "office", "admissions", "services",
  ]);

  // Check if they share significant NON-GENERIC matched query terms (at least 2).
  const primaryTerms = new Set(
    primary.matchedTerms.filter((t) => !GENERIC_TERMS.has(t)),
  );
  const overlap = secondary.matchedTerms.filter(
    (t) => !GENERIC_TERMS.has(t) && primaryTerms.has(t),
  );
  return overlap.length >= 2;
}

/**
 * Build a grounded answer from ranked sources. Uses the primary page's relevant chunks
 * to compose a focused answer. Secondary sources are included in citations but their
 * content is only added to the answer if they address the same topic.
 *
 * This prevents mixing unrelated retrieved documents into a single response.
 */
export function generateGroundedAnswer(
  ranked: readonly RankedSource[],
  strongThreshold: number,
  query: string = "",
): GroundedAnswer | null {
  const primary = ranked[0];
  if (!primary) return null;

  // Determine which additional pages to cite (for the citations section).
  const cited: RankedSource[] = [primary];
  for (const candidate of ranked.slice(1)) {
    if (cited.length >= MAX_CITED) break;
    if (candidate.score >= strongThreshold) cited.push(candidate);
  }

  // Gather only relevant chunks from the primary page.
  const chunks = gatherRelevantChunks(primary, query);
  const allSentences = chunks.flatMap(splitSentences);

  // Compose a formatted answer from the primary source only.
  const primaryAnswer = composeFromChunks(allSentences, "[1]", query);

  // Only append supplementary sources that are topically related to the primary.
  // Unrelated sources remain in citations/related-pages but don't pollute the answer.
  const relatedSupplements = cited
    .slice(1)
    .filter((s) => isTopicallyRelated(primary, s));

  let finalAnswer = primaryAnswer;
  if (relatedSupplements.length > 0) {
    const supplements: string[] = [];
    for (let i = 0; i < relatedSupplements.length; i++) {
      const source = relatedSupplements[i]!;
      const citationIdx = cited.indexOf(source) + 1;
      const marker = `[${citationIdx}]`;
      const chunk = normalize(source.bestChunk.text);
      const sentences = splitSentences(chunk);
      const brief = sentences.slice(0, 2).join(" ");
      supplements.push(`${brief} ${marker}`);
    }
    finalAnswer = `${primaryAnswer}\n\n${supplements.join("\n\n")}`;
  }

  return { answer: finalAnswer, citedSources: cited };
}
