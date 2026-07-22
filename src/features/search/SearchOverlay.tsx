"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EXAMPLE_QUESTIONS } from "@/lib/rag/examples";
import { useSearch } from "./useSearch";
import { SearchAnswerView } from "./SearchAnswerView";

/**
 * The AI website search overlay — the flagship improvement over the current site. Opens
 * from the header search control, accepts keywords or natural-language questions, and shows
 * a direct grounded answer with official-source citations inline (without leaving the page).
 * Enter submits, Escape closes; focus is moved into the field on open and restored on close.
 */
export function SearchOverlay({
  open,
  onClose,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { status, response, run, reset } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Focus management + Escape handling.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  const submit = useCallback(
    (value: string) => {
      const q = value.trim();
      if (!q) return;
      setQuery(q);
      void run(q);
    },
    [run],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(query);
  };

  const viewAllResults = () => {
    const q = query.trim();
    if (!q) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-lc-navy-dark/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search Lemoore College"
        className="mx-auto mt-0 flex max-h-full w-full max-w-3xl flex-col overflow-hidden bg-white shadow-2xl sm:mt-10 sm:rounded-xl"
      >
        {/* Search bar */}
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-3 border-b border-lc-line px-4 py-4 sm:px-6"
        >
          <span aria-hidden="true" className="text-lc-blue">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" strokeLinecap="round" />
            </svg>
          </span>
          <label htmlFor="site-search-input" className="sr-only">
            Ask a question or search Lemoore College
          </label>
          <input
            id="site-search-input"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question, e.g. “How do I order my transcript?”"
            autoComplete="off"
            className="min-w-0 flex-1 border-0 bg-transparent text-lg text-lc-ink outline-none placeholder:text-lc-slate/70"
          />
          <button
            type="submit"
            className="rounded-md bg-lc-blue px-4 py-2 text-sm font-semibold text-white hover:bg-lc-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lc-blue"
          >
            Search
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded-md p-2 text-lc-slate hover:bg-lc-wash hover:text-lc-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </form>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <p className="mb-4 text-xs font-medium text-lc-slate">
            AI-powered search · answers cite official Lemoore College pages · Prototype demo
          </p>

          {status === "idle" && !response ? (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-lc-slate">
                Try asking
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => submit(q)}
                      className="rounded-full border border-lc-line bg-white px-3 py-1.5 text-sm text-lc-blue hover:border-lc-blue hover:bg-lc-blue-light"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {status === "submitting" ? (
            <div className="flex items-center gap-3 py-8 text-lc-slate" aria-live="polite">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-lc-line border-t-lc-blue" />
              Searching official sources…
            </div>
          ) : null}

          {response && status !== "submitting" ? (
            <div aria-live="polite">
              <SearchAnswerView response={response} onSelectSuggestion={submit} />
              {response.kind === "answered" ? (
                <button
                  type="button"
                  onClick={viewAllResults}
                  className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-lc-blue hover:underline"
                >
                  Open full results page
                  <span aria-hidden="true">→</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { EXAMPLE_QUESTIONS };
