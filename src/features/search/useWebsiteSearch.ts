"use client";

import { useCallback, useRef, useState } from "react";
import type { SearchResponse } from "@/types";
import { searchService } from "@/lib/search";

/** Explicit search lifecycle the UI switches on (loading / empty / results / error). */
export type SearchStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "loading"; readonly query: string }
  | { readonly kind: "done"; readonly response: SearchResponse }
  | { readonly kind: "error"; readonly message: string };

const SEARCH_ERROR =
  "Sorry — search is unavailable right now. Please try again.";

export interface UseWebsiteSearch {
  readonly status: SearchStatus;
  /** Run a search. Empty/whitespace input resets to the idle state. */
  readonly run: (query: string) => Promise<void>;
  /** Clear results back to the idle state. */
  readonly reset: () => void;
}

/**
 * Owns website-search state against the swappable {@link searchService}. Latest-query-wins:
 * a newer search supersedes an in-flight older one, so stale results never render.
 */
export function useWebsiteSearch(): UseWebsiteSearch {
  const [status, setStatus] = useState<SearchStatus>({ kind: "idle" });
  const requestIdRef = useRef(0);

  const run = useCallback(async (query: string) => {
    const text = query.trim();
    const requestId = (requestIdRef.current += 1);

    if (text.length === 0) {
      setStatus({ kind: "idle" });
      return;
    }

    setStatus({ kind: "loading", query: text });
    try {
      const response = await searchService.search({ text });
      if (requestIdRef.current !== requestId) return; // superseded by a newer search
      setStatus({ kind: "done", response });
    } catch {
      if (requestIdRef.current !== requestId) return;
      setStatus({ kind: "error", message: SEARCH_ERROR });
    }
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setStatus({ kind: "idle" });
  }, []);

  return { status, run, reset };
}
