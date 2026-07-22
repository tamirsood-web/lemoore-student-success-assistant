"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WebsiteSearchResponse } from "@/types";
import { EXAMPLE_QUESTIONS } from "@/lib/rag/examples";
import { SearchAnswerView } from "@/features/search/SearchAnswerView";

type Turn = {
  readonly id: number;
  readonly question: string;
  readonly response: WebsiteSearchResponse | null; // null = pending
};

const SUGGESTED = EXAMPLE_QUESTIONS.slice(0, 4);

/**
 * Floating "Student Assistant" — the one visibly new component versus the official site.
 * It is unobtrusive (bottom-right), keyboard accessible, responsive, clearly labeled as a
 * prototype, and answers using the SAME shared pipeline + official-source corpus as website
 * search (POST /api/search), so its answers carry the same official citations.
 */
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<readonly Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const idRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    // Guard: jsdom (tests) doesn't implement Element.scrollTo.
    logRef.current?.scrollTo?.({ top: logRef.current.scrollHeight });
  }, [turns]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || pending) return;
      idRef.current += 1;
      const id = idRef.current;
      setDraft("");
      setPending(true);
      setTurns((prev) => [...prev, { id, question, response: null }]);
      let response: WebsiteSearchResponse;
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: question }),
        });
        response = (await res.json()) as WebsiteSearchResponse;
      } catch {
        response = { kind: "error", message: "Please try again in a moment." };
      }
      setTurns((prev) =>
        prev.map((t) => (t.id === id ? { ...t, response } : t)),
      );
      setPending(false);
    },
    [pending],
  );

  return (
    <>
      {/* Launcher */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-lc-blue px-5 py-3 text-sm font-semibold text-white shadow-xl hover:bg-lc-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lc-gold"
          aria-label="Open the Student Assistant"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z" strokeLinejoin="round" />
          </svg>
          Student Assistant
        </button>
      ) : null}

      {/* Panel */}
      {open ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Student Assistant"
          className="fixed bottom-4 right-4 z-40 flex h-[min(80vh,620px)] w-[min(94vw,400px)] flex-col overflow-hidden rounded-2xl border border-lc-line bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-lc-navy px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">Student Assistant</p>
              <p className="text-[0.68rem] text-lc-gold">
                Prototype · answers cite official pages
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Student Assistant"
              className="rounded-md p-1.5 hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Log */}
          <div ref={logRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {turns.length === 0 ? (
              <div>
                <p className="text-sm text-lc-slate">
                  Hi! Ask me anything about Lemoore College. I answer using official
                  college pages and show you the sources.
                </p>
                <ul className="mt-3 space-y-2">
                  {SUGGESTED.map((q) => (
                    <li key={q}>
                      <button
                        type="button"
                        onClick={() => ask(q)}
                        className="w-full rounded-lg border border-lc-line px-3 py-2 text-left text-sm text-lc-blue hover:border-lc-blue hover:bg-lc-blue-light"
                      >
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {turns.map((turn) => (
              <div key={turn.id} className="space-y-3">
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-lc-blue px-3.5 py-2 text-sm text-white">
                  {turn.question}
                </p>
                <div className="rounded-2xl rounded-bl-sm border border-lc-line bg-lc-wash px-3.5 py-3">
                  {turn.response === null ? (
                    <span className="flex items-center gap-2 text-sm text-lc-slate" aria-live="polite">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-lc-line border-t-lc-blue" />
                      Checking official sources…
                    </span>
                  ) : (
                    <SearchAnswerView response={turn.response} onSelectSuggestion={ask} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(draft);
            }}
            className="flex items-center gap-2 border-t border-lc-line p-3"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Ask the Student Assistant a question
            </label>
            <input
              id="assistant-input"
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask a question…"
              className="min-w-0 flex-1 rounded-full border border-lc-line px-4 py-2 text-sm text-lc-ink outline-none focus:border-lc-blue"
            />
            <button
              type="submit"
              disabled={pending || draft.trim().length === 0}
              className="rounded-full bg-lc-blue px-4 py-2 text-sm font-semibold text-white hover:bg-lc-blue-dark disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
