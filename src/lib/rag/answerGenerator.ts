// GroundedAnswerGenerator — compose a concise answer STRICTLY from retrieved evidence.
//
// Local mode is deliberately extractive: the answer text is the verbatim supporting
// excerpt(s) of the top-ranked official page, with an inline numbered citation marker. It
// never adds outside knowledge or connective factual claims, so the answer cannot contain
// anything absent from the official corpus (mirrors the existing composeAnswer contract).
// Returns null when there is no page to ground an answer.

import type { RankedSource } from "./reranker";

export type GroundedAnswer = {
  /** Concise answer text with a trailing inline citation marker, e.g. "... [1]". */
  readonly answer: string;
  /** The pages actually cited, in citation order (index 0 -> "[1]"). */
  readonly citedSources: readonly RankedSource[];
};

/** Maximum number of pages cited inline for a single answer. */
const MAX_CITED = 3;

/** Trim/normalize an excerpt for display as answer text. */
function cleanExcerpt(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Build a grounded answer from ranked sources. The primary (highest-ranked) page supplies
 * the answer text; up to two additional strongly-relevant pages are attached as further
 * citations. `strongThreshold` gates which secondary pages are cited.
 */
export function generateGroundedAnswer(
  ranked: readonly RankedSource[],
  strongThreshold: number,
): GroundedAnswer | null {
  const primary = ranked[0];
  if (!primary) return null;

  const cited = [primary];
  for (const candidate of ranked.slice(1)) {
    if (cited.length >= MAX_CITED) break;
    if (candidate.score >= strongThreshold) cited.push(candidate);
  }

  const answer = `${cleanExcerpt(primary.bestChunk.text)} [1]`;
  return { answer, citedSources: cited };
}
