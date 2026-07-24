// Answer composition from retrieved snippets (server-only, deterministic).
//
// Composes a natural, conversational answer grounded STRICTLY in the retrieved snippet
// excerpts. The answer reads as though written by a helpful college staff member while
// preserving every factual detail exactly as it appears in the sources.
//
// Generation rules:
//   1. Lead with the answer — the first sentence directly addresses the user's question.
//   2. Summarize and explain in natural English — never copy long passages verbatim.
//   3. Preserve factual accuracy — all dates, numbers, names, locations, and policies
//      come directly from the source text without alteration.
//   4. Keep it concise — most answers are 2–4 short paragraphs.
//   5. Use friendly, approachable language (Student Services tone).
//   6. When evidence is insufficient, return null (escalation path takes over).
//
// Correctness Property 1: every factual claim in the output exists in the snippet excerpts.
// Correctness Property 3: when there are no snippets, returns null.

import type { RetrievalResult } from "@/types";
import { formatAnswer } from "@/lib/rag/answerFormatter";

/** Separator between composed answer paragraphs. */
export const ANSWER_SEPARATOR = "\n\n";

// ---------------------------------------------------------------------------
// Text utilities
// ---------------------------------------------------------------------------

/** Normalize whitespace. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Split text into sentences. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Check if a sentence is a marketing/promotional opener that adds no information. */
function isFluffOpener(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return (
    lower.startsWith("what are you waiting for") ||
    lower.startsWith("classes around your schedule") ||
    lower.startsWith("find the classes you need") ||
    /^it'?s free to apply\.?$/i.test(sentence)
  );
}

/** Check if a sentence contains contact/location details (as presented information, not merely mentioning). */
function isContactInfo(sentence: string): boolean {
  // Actual phone number pattern.
  if (/\(\d{3}\)\s*\d{3}[-.]\d{4}/.test(sentence)) return true;
  // Actual email address.
  if (/\b[\w.-]+@[\w.-]+\.\w{2,}\b/.test(sentence)) return true;
  // Explicit labeled contact fields: "Phone:", "Email:", "Hours:", "Office:"
  if (/\b(phone|email|hours|office|location|fax)\s*:/i.test(sentence)) return true;
  // Location sentences: "located at/in", "situated in/at"
  if (/\b(located|situated)\s+(at|in)\b/i.test(sentence)) return true;
  // Business hours patterns
  if (/\b(mon[- ]?fri|monday\s*[-–]\s*friday|open\s+mon)/i.test(sentence)) return true;
  if (/\bhours\s+(are|:)/i.test(sentence)) return true;
  // "Contact [Name]" pattern
  if (/^contact\s+[A-Z]/i.test(sentence)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/**
 * Compose an answer from a retrieval result. Returns a natural, adaptively-formatted
 * response grounded in the snippet excerpts, or `null` when no snippets support an answer.
 *
 * When `query` is provided, the formatter selects the best presentation format
 * (numbered steps, bullets, contact block, etc.) based on the question type.
 */
export function composeAnswer(result: RetrievalResult, query?: string): string | null {
  if (result.snippets.length === 0) return null;

  const allExcerpts = result.snippets.map((snippet) => normalize(snippet.excerpt));
  const allSentences = allExcerpts.flatMap(splitSentences);

  // Deduplicate sentences that appear in multiple snippets.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const sentence of allSentences) {
    const key = sentence.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(sentence);
    }
  }

  // Classify sentences.
  const info: string[] = [];
  const contact: string[] = [];
  for (const sentence of unique) {
    if (isFluffOpener(sentence)) continue;
    if (isContactInfo(sentence)) {
      contact.push(sentence);
    } else {
      info.push(sentence);
    }
  }

  // Fallback: if everything was filtered, use the raw first excerpt.
  if (info.length === 0 && contact.length === 0) {
    return normalize(allExcerpts[0] ?? "");
  }

  // Apply adaptive formatting when query is available.
  return formatAnswer({ query: query ?? "", body: info, contact });
}
