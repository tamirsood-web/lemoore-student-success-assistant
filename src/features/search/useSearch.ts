"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WebsiteSearchResponse } from "@/types";

export type SearchStatus = "idle" | "submitting" | "done" | "error";

const NETWORK_ERROR: WebsiteSearchResponse = {
  kind: "error",
  message: "We couldn't reach the search service. Please try again.",
};

/**
 * Client hook that drives the shared answer pipeline via POST /api/search. Used by the
 * website search overlay, the /search results page, and the floating assistant — all three
 * consume the identical `WebsiteSearchResponse` contract from one endpoint.
 */
export function useSearch() {
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [response, setResponse] = useState<WebsiteSearchResponse | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("submitting");
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
        signal: controller.signal,
      });
      const data = (await res.json()) as WebsiteSearchResponse;
      setResponse(data);
      setStatus(data.kind === "error" ? "error" : "done");
    } catch {
      if (controller.signal.aborted) return;
      setResponse(NETWORK_ERROR);
      setStatus("error");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setResponse(null);
  }, []);

  return { status, response, run, reset } as const;
}
