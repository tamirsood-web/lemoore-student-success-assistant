// Answer composition from retrieved snippets (server-only, deterministic).
//
// The composed answer is built STRICTLY from the excerpt text of the retrieved snippets —
// no outside knowledge, no connective claims of our own. This makes it impossible for the
// answer to contain content that is not present in the mock sources (Correctness
// Property 1). When there is nothing to ground an answer, it returns null and the
// cannot-verify / escalation path takes over (Correctness Property 3).

import type { RetrievalResult } from "@/types";

/** Separator between multiple snippet excerpts in a composed answer. */
export const ANSWER_SEPARATOR = "\n\n";

/**
 * Compose an answer from a retrieval result. Returns the concatenation of the snippet
 * excerpts (verbatim), or `null` when no snippets support an answer.
 */
export function composeAnswer(result: RetrievalResult): string | null {
  if (result.snippets.length === 0) return null;
  return result.snippets.map((snippet) => snippet.excerpt).join(ANSWER_SEPARATOR);
}
