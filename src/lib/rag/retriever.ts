// KnowledgeRetriever — lexical scoring over the official-source chunk index (server-only).
//
// Deterministic stand-in for a vector retrieve step. Each chunk is scored on its BODY text;
// page-level fields (curated topic, title, department) are scored ONCE per page (not per
// chunk) so a page with more chunks can't inflate a weak department-only match. Reads ONLY
// the local official corpus; makes no network/AWS calls. Query tokens are matched as data,
// never interpreted as instructions.

import type { OfficialSource } from "@/types";
import { corpusChunks, type CorpusChunk } from "@/lib/knowledge/corpus";
import { rewriteQuery, tokenize, type RewrittenQuery } from "./queryRewriter";

/** Field weights: a hit in the curated topic/title is a much stronger signal than body. */
const WEIGHT_TOPIC = 5;
const WEIGHT_TITLE = 3;
const WEIGHT_DEPARTMENT = 2;
const WEIGHT_BODY = 1;

/**
 * A scored chunk. `bodyScore`/`bodyTerms` are per-chunk (from the chunk text). `fieldScore`/
 * `fieldTerms` are page-level (topic/title/department) and identical for every chunk of the
 * same page, so downstream ranking can add the page contribution exactly once.
 */
export type ScoredChunk = {
  readonly chunk: CorpusChunk["chunk"];
  readonly source: OfficialSource;
  readonly bodyScore: number;
  readonly bodyTerms: readonly string[];
  readonly fieldScore: number;
  readonly fieldTerms: readonly string[];
};

function fieldTokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

/** Page-level (topic + title + department) score, computed once per source. */
function scoreFields(
  source: OfficialSource,
  expanded: readonly string[],
): { score: number; terms: string[] } {
  const topicSet = fieldTokenSet(source.topic);
  const titleSet = fieldTokenSet(source.title);
  const deptSet = fieldTokenSet(source.department);
  let score = 0;
  const matched = new Set<string>();
  for (const term of expanded) {
    let hit = false;
    if (topicSet.has(term)) {
      score += WEIGHT_TOPIC;
      hit = true;
    }
    if (titleSet.has(term)) {
      score += WEIGHT_TITLE;
      hit = true;
    }
    if (deptSet.has(term)) {
      score += WEIGHT_DEPARTMENT;
      hit = true;
    }
    if (hit) matched.add(term);
  }
  return { score, terms: Array.from(matched) };
}

/** Per-chunk body score. */
function scoreBody(
  text: string,
  expanded: readonly string[],
): { score: number; terms: string[] } {
  const bodySet = fieldTokenSet(text);
  let score = 0;
  const matched = new Set<string>();
  for (const term of expanded) {
    if (bodySet.has(term)) {
      score += WEIGHT_BODY;
      matched.add(term);
    }
  }
  return { score, terms: Array.from(matched) };
}

export interface KnowledgeRetriever {
  retrieve(query: string | RewrittenQuery, limit?: number): ScoredChunk[];
}

/** The shared local retriever over the official corpus. */
export const localRetriever: KnowledgeRetriever = {
  retrieve(query, limit = 12) {
    const rewritten = typeof query === "string" ? rewriteQuery(query) : query;
    const fieldCache = new Map<string, { score: number; terms: string[] }>();

    return corpusChunks
      .map((entry): ScoredChunk => {
        let field = fieldCache.get(entry.source.id);
        if (!field) {
          field = scoreFields(entry.source, rewritten.expanded);
          fieldCache.set(entry.source.id, field);
        }
        const body = scoreBody(entry.chunk.text, rewritten.expanded);
        return {
          chunk: entry.chunk,
          source: entry.source,
          bodyScore: body.score,
          bodyTerms: body.terms,
          fieldScore: field.score,
          fieldTerms: field.terms,
        };
      })
      .filter((scored) => scored.bodyScore > 0 || scored.fieldScore > 0)
      // Deterministic ordering: strongest combined signal first, then stable by chunk id.
      .sort((a, b) => {
        const sa = a.bodyScore + a.fieldScore;
        const sb = b.bodyScore + b.fieldScore;
        return sb !== sa ? sb - sa : a.chunk.id.localeCompare(b.chunk.id);
      })
      .slice(0, limit);
  },
};
