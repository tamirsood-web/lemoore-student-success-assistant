// ResultReranker — collapse scored chunks into ranked source pages (server-only).
//
// Retrieval returns many chunks; a citation is a page. This groups scored chunks by source,
// keeps the single best chunk per page as its supporting excerpt, and aggregates evidence:
// the total is the SUM of per-chunk body scores PLUS the page-level field score counted
// ONCE (topic/title/department is a page property, not a per-chunk one).

import type { OfficialSource, OfficialChunk } from "@/types";
import type { ScoredChunk } from "./retriever";

/** A ranked source page with its strongest supporting chunk and aggregate evidence. */
export type RankedSource = {
  readonly source: OfficialSource;
  /** The single highest-scoring chunk from this page (the citation excerpt). */
  readonly bestChunk: OfficialChunk;
  /** sum(chunk body scores) + page field score (added once). */
  readonly score: number;
  /** Distinct query terms matched across body + page fields. */
  readonly matchedTerms: readonly string[];
};

/** Group scored chunks by source and rank the resulting pages. */
export function rerank(scored: readonly ScoredChunk[]): RankedSource[] {
  const bySource = new Map<
    string,
    {
      source: OfficialSource;
      best: ScoredChunk;
      bodyTotal: number;
      fieldScore: number;
      matched: Set<string>;
    }
  >();

  for (const entry of scored) {
    const existing = bySource.get(entry.source.id);
    if (!existing) {
      bySource.set(entry.source.id, {
        source: entry.source,
        best: entry,
        bodyTotal: entry.bodyScore,
        // Page-level field score is identical across the page's chunks — take it once.
        fieldScore: entry.fieldScore,
        matched: new Set([...entry.bodyTerms, ...entry.fieldTerms]),
      });
      continue;
    }
    existing.bodyTotal += entry.bodyScore;
    for (const term of entry.bodyTerms) existing.matched.add(term);
    for (const term of entry.fieldTerms) existing.matched.add(term);
    if (
      entry.bodyScore > existing.best.bodyScore ||
      (entry.bodyScore === existing.best.bodyScore &&
        entry.chunk.id.localeCompare(existing.best.chunk.id) < 0)
    ) {
      existing.best = entry;
    }
  }

  return Array.from(bySource.values())
    .map((group) => ({
      source: group.source,
      bestChunk: group.best.chunk,
      score: group.bodyTotal + group.fieldScore,
      matchedTerms: Array.from(group.matched),
    }))
    .sort((a, b) =>
      b.score !== a.score
        ? b.score - a.score
        : a.source.id.localeCompare(b.source.id),
    );
}
