"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSearch } from "./useSearch";
import { SearchAnswerView } from "./SearchAnswerView";

/**
 * Full search-results page, rendered inside the Lemoore site shell. Reads the query from
 * `?q=`, runs the shared pipeline, and shows the direct answer + official sources. The query
 * stays in the URL (shareable, e.g. /search?q=financial+aid) and is preserved in the field.
 */
export function SearchResultsView() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [draft, setDraft] = useState(initial);
  const { status, response, run } = useSearch();

  // Run whenever the URL query changes.
  useEffect(() => {
    const q = params.get("q")?.trim() ?? "";
    setDraft(q);
    if (q) void run(q);
  }, [params, run]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-lc-ink">Search Results</h1>
      <p className="mt-1 text-sm text-lc-slate">
        AI-powered search of official Lemoore College pages · Prototype demo
      </p>

      <form onSubmit={submit} className="mt-5 flex items-center gap-2">
        <label htmlFor="results-query" className="sr-only">
          Search Lemoore College
        </label>
        <input
          id="results-query"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question or enter keywords"
          className="min-w-0 flex-1 rounded-md border border-lc-line px-4 py-2.5 text-base text-lc-ink outline-none focus:border-lc-blue"
        />
        <button
          type="submit"
          className="rounded-md bg-lc-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-lc-blue-dark"
        >
          Search
        </button>
      </form>

      <div className="mt-8">
        {!initial && status === "idle" ? (
          <p className="text-lc-slate">Enter a question above to search official sources.</p>
        ) : null}

        {status === "submitting" ? (
          <div className="flex items-center gap-3 py-8 text-lc-slate" aria-live="polite">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-lc-line border-t-lc-blue" />
            Searching official sources…
          </div>
        ) : null}

        {response && status !== "submitting" ? (
          <div aria-live="polite">
            <SearchAnswerView response={response} onSelectSuggestion={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
