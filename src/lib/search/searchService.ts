// Website SearchService — the stable façade the UI depends on.
//
// The UI never talks to a `SearchProvider` directly; it talks to a `SearchService`. The
// service owns provider selection and any cross-cutting concerns (input normalization,
// telemetry hooks, and later, caching). Swapping the local provider for a Bedrock Knowledge
// Base provider is a one-line change here — the UI is unaffected (docs/INTEGRATIONS.md).

import type { SearchProvider, SearchQuery, SearchResponse } from "@/types";
import { createLocalSearchProvider } from "./localSearchProvider";

export interface SearchService {
  /** Run a search through the active provider. Never throws for empty input. */
  search(query: SearchQuery): Promise<SearchResponse>;
  /** Name of the active provider (diagnostics only). */
  readonly providerName: string;
}

/** Wrap a provider in the service façade. */
export function createSearchService(provider: SearchProvider): SearchService {
  return {
    providerName: provider.name,
    async search(query: SearchQuery): Promise<SearchResponse> {
      const text = query.text.trim();
      if (text.length === 0) {
        return { query: text, results: [], totalMatches: 0 };
      }
      return provider.search({ ...query, text });
    },
  };
}

/**
 * The default service used by the app. Today it is backed by the local mock provider.
 * To move to a managed backend, construct the service with a different provider here (or
 * behind an env flag) — no UI change is required.
 */
export const searchService: SearchService = createSearchService(
  createLocalSearchProvider(),
);
