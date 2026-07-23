"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
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
        <div className="chat-input min-w-0 flex-1">
          <label className="chat-input__label chat-input__label--hidden" htmlFor="results-query">
            Search Lemoore College
          </label>
          <div className="chat-input__field">
            <svg className="chat-input__icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path d="M15 15L16.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16.9333 19.0252C16.3556 18.4475 16.3556 17.5109 16.9333 16.9333C17.5109 16.3556 18.4475 16.3556 19.0252 16.9333L21.0667 18.9748C21.6444 19.5525 21.6444 20.4891 21.0667 21.0667C20.4891 21.6444 19.5525 21.6444 18.9748 21.0667L16.9333 19.0252Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16.5 9.5C16.5 5.63401 13.366 2.5 9.5 2.5C5.63401 2.5 2.5 5.63401 2.5 9.5C2.5 13.366 5.63401 16.5 9.5 16.5C13.366 16.5 16.5 13.366 16.5 9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <textarea
              className="chat-input__textarea"
              id="results-query"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(e);
                }
              }}
              placeholder="Ask a question or enter keywords"
              autoComplete="off"
              rows={1}
            />
          </div>
        </div>
        <button type="submit" className="btn btn--primary">
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
            {response.kind === "clarification" && response.suggestedQuestions.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {response.suggestedQuestions.map((q) => (
                  <li key={q}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/search?q=${encodeURIComponent(q)}`)}
                    >
                      {q}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
