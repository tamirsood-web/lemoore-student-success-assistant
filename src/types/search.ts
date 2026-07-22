// Website-search seam types.
//
// The homepage search bar is deliberately decoupled from any concrete retrieval backend.
// Today it is served by a local, deterministic provider over the mock knowledge base
// (src/lib/search/localSearchProvider.ts). Later the SAME `SearchProvider` contract can be
// fulfilled by an Amazon Bedrock Knowledge Base (semantic retrieval) without any change to
// the UI — see docs/INTEGRATIONS.md. Depending only on these types keeps that swap contained.

/** How a result was matched, so the UI can (optionally) explain relevance. */
export type SearchMatchKind = "keyword" | "semantic";

/**
 * A single website search result. This is intentionally close to a citation/source shape so
 * results can link out and, later, be produced by the same corpus a Knowledge Base indexes.
 */
export type SearchResult = {
  /** Stable id of the underlying source record. */
  readonly id: string;
  readonly title: string;
  /** Short, human-readable category label (e.g. "Financial Aid"). */
  readonly category: string;
  /** Plain-language snippet describing the result. Never raw HTML. */
  readonly snippet: string;
  /** Optional link to the underlying page/source. */
  readonly url?: string;
  /** Relevance score in the range [0, 1]; higher is more relevant. */
  readonly score: number;
  /** Which matching strategy surfaced this result. */
  readonly matchKind: SearchMatchKind;
};

/** A search request. `limit` caps the number of returned results. */
export type SearchQuery = {
  readonly text: string;
  readonly limit?: number;
};

/** Normalized search response returned by every provider and the service. */
export type SearchResponse = {
  readonly query: string;
  readonly results: readonly SearchResult[];
  /** Total matches found before `limit` was applied. */
  readonly totalMatches: number;
};

/**
 * The retrieval seam the website search depends on. `search` MUST be pure with respect to
 * the query (deterministic) in the local implementation, and MUST NOT throw for empty input
 * — it returns an empty response instead. A future Bedrock-backed provider satisfies the
 * same signature; the async return type already allows a network round-trip.
 */
export interface SearchProvider {
  /** Stable identifier for the active provider, surfaced only for diagnostics/telemetry. */
  readonly name: string;
  search(query: SearchQuery): Promise<SearchResponse>;
}
