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
 * Floating "Student Assistant" — uses the production design-system components:
 * FAB (launcher), Chat Window (panel), Message Bubble (messages), Chat Input (footer).
 * Answers via POST /api/search with the same shared pipeline + official-source corpus.
 */
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [turns, setTurns] = useState<readonly Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const idRef = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Focus textarea when panel opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [open]);

  // Scroll to bottom on new turns
  useEffect(() => {
    bodyRef.current?.scrollTo?.({ top: bodyRef.current.scrollHeight });
  }, [turns]);

  // Escape to close
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

  // --- Chat Input behavior (mirrors production chat-input.js) ---
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const maxHeight = 104; // --chat-input-max-height
    el.style.height = "auto";
    if (el.scrollHeight >= maxHeight) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = "auto";
    } else {
      el.style.height = `${el.scrollHeight}px`;
      el.style.overflowY = "hidden";
    }
  }, []);

  const handleTextareaInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(e.target.value);
      resizeTextarea();
    },
    [resizeTextarea],
  );

  const handleSubmit = useCallback(() => {
    const value = draft.trim();
    if (!value || pending) return;
    void ask(value);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }
  }, [draft, pending, ask]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter") return;
      if (e.nativeEvent.isComposing) return;
      if (e.shiftKey) {
        requestAnimationFrame(resizeTextarea);
        return;
      }
      e.preventDefault();
      handleSubmit();
    },
    [handleSubmit, resizeTextarea],
  );

  // --- Expand / Collapse ---
  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // --- Open / Close ---
  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  // Build the expand/collapse classes for the chat window
  const chatWindowClasses = [
    "chat-window",
    expanded ? "chat-window--expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* FAB Launcher — production FAB component */}
      {!open ? (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            className="fab"
            aria-label="Open the Student Assistant"
            title="Open the Student Assistant"
            onClick={handleOpen}
          >
            <img
              className="fab__icon"
              src="/design-system/icons/eagle-headset.svg"
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>
      ) : null}

      {/* Chat Window Panel — production Chat Window component */}
      {open ? (
        <div
          ref={wrapperRef}
          className="fixed bottom-6 right-6 z-40"
          role="dialog"
          aria-modal="false"
          aria-label="Student Assistant"
        >
          <div
            className={chatWindowClasses}
            style={expanded ? { position: "fixed", top: "12.5vh", left: "12.5vw", width: "75vw", height: "75vh", maxWidth: "75vw", zIndex: 200 } : undefined}
          >
            {/* Header */}
            <div className="chat-window__header">
              <h2 className="chat-window__title">Student Assistant</h2>
              <div className="chat-window__actions" role="group" aria-label="Window controls">
                {/* Expand / Collapse */}
                <button
                  type="button"
                  className="btn btn--icon"
                  aria-label={expanded ? "Restore chat window" : "Expand chat window"}
                  title={expanded ? "Restore chat window" : "Expand chat window"}
                  aria-expanded={expanded}
                  onClick={toggleExpand}
                >
                  {!expanded ? (
                    <svg className="btn__icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                      <path d="M16.4999 3.26621C17.3443 3.25421 20.1408 2.67328 20.7337 3.26621C21.3266 3.85913 20.7457 6.65559 20.7337 7.5M20.5059 3.49097L13.5021 10.4961" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3.26636 16.5001C3.25436 17.3445 2.67343 20.141 3.26636 20.7339C3.85928 21.3268 6.65574 20.7459 7.50015 20.7339M10.502 13.4976L3.49824 20.5027" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg className="btn__icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                      <path d="M2.46186 20.4697C2.16896 20.7626 2.16896 21.2374 2.46186 21.5303C2.75475 21.8232 3.22962 21.8232 3.52252 21.5303L2.99219 21L2.46186 20.4697ZM10.0225 15.0303C10.3154 14.7374 10.3154 14.2626 10.0225 13.9697C9.72962 13.6768 9.25475 13.6768 8.96186 13.9697L9.49219 14.5L10.0225 15.0303ZM2.99219 21L3.52252 21.5303L10.0225 15.0303L9.49219 14.5L8.96186 13.9697L2.46186 20.4697L2.99219 21Z" fill="currentColor"/>
                      <path d="M21.5225 3.53033C21.8154 3.23744 21.8154 2.76256 21.5225 2.46967C21.2296 2.17678 20.7548 2.17678 20.4619 2.46967L20.9922 3L21.5225 3.53033ZM13.9619 8.96967C13.669 9.26256 13.669 9.73744 13.9619 10.0303C14.2548 10.3232 14.7296 10.3232 15.0225 10.0303L14.4922 9.5L13.9619 8.96967ZM20.9922 3L20.4619 2.46967L13.9619 8.96967L14.4922 9.5L15.0225 10.0303L21.5225 3.53033L20.9922 3Z" fill="currentColor"/>
                      <path d="M14.2688 5.00098C14.2688 5.00098 13.6464 9.10202 14.2688 9.72438C14.8911 10.3467 18.9922 9.72436 18.9922 9.72436" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9.71561 19.001C9.71561 19.001 10.3379 14.8999 9.71558 14.2776C9.09323 13.6552 4.99219 14.2776 4.99219 14.2776" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                {/* Minimize */}
                <button
                  type="button"
                  className="btn btn--icon"
                  aria-label="Minimize"
                  onClick={handleClose}
                >
                  <svg className="btn__icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                    <path d="M19.002 12H5.00001" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Body — scrollable message area */}
            <div ref={bodyRef} className="chat-window__body">
              <div className="chat-window__content">
                {turns.length === 0 ? (
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.5, color: "var(--primitive-color-gray-600)" }}>
                    <p style={{ marginBottom: 12 }}>
                      Hi! Ask me anything about Lemoore College. I answer using official
                      college pages and show you the sources.
                    </p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      {SUGGESTED.map((q) => (
                        <li key={q}>
                          <button
                            type="button"
                            className="btn btn--secondary"
                            onClick={() => ask(q)}
                            style={{ width: "100%", textAlign: "left", whiteSpace: "normal", fontSize: 14 }}
                          >
                            {q}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {turns.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {turns.map((turn) => (
                      <div key={turn.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* User message — production Message Bubble (user variant) */}
                        <div className="message-bubble message-bubble--user" style={{ alignSelf: "flex-end", maxWidth: "85%" }}>
                          <div className="message-bubble__content" style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 400, lineHeight: 1.5, color: "#121212" }}>
                            {turn.question}
                          </div>
                        </div>

                        {/* Assistant response — production Message Bubble (agent variant) */}
                        <div className="message-bubble message-bubble--agent" style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
                          <div className="message-bubble__content" style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 400, lineHeight: 1.5, color: "#121212" }}>
                            {turn.response === null ? (
                              <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--primitive-color-gray-600)" }} aria-live="polite">
                                <svg style={{ width: 16, height: 16, animation: "btn-spin 1.6s linear infinite" }} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M11.9961 3V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M11.9961 18V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M20.9961 12H17.9961" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M5.99609 12H2.99609" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M18.3596 5.63672L16.2383 7.75804" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M7.75413 16.2422L5.63281 18.3635" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M18.3596 18.3635L16.2383 16.2422" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M7.75413 7.75804L5.63281 5.63672" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                Checking official sources…
                              </span>
                            ) : (
                              <SearchAnswerView response={turn.response} onSelectSuggestion={ask} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Footer — production Chat Input + Send button */}
            <div className="chat-window__footer">
              <div className="chat-input">
                <label className="chat-input__label" htmlFor="assistant-chat-input" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
                  Ask the Student Assistant a question
                </label>
                <textarea
                  ref={textareaRef}
                  className="chat-input__textarea"
                  id="assistant-chat-input"
                  placeholder="Ask a question…"
                  rows={1}
                  value={draft}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  disabled={pending}
                />
              </div>
              <button
                type="button"
                className="btn btn--primary"
                disabled={pending || draft.trim().length === 0}
                onClick={handleSubmit}
              >
                Send
                <svg className="btn__icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                  <path d="M9.49811 15L16.9981 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.00634 7.67888L15.327 4.21881C18.3688 2.78111 19.8897 2.06226 20.8598 2.78341C21.8299 3.50455 21.5527 5.14799 20.9984 8.43486L20.0435 14.0968C19.6811 16.246 19.4998 17.3205 18.6989 17.7891C17.8979 18.2577 16.8574 17.8978 14.7765 17.178L8.41077 14.9762C4.51917 13.6301 2.57337 12.9571 2.50019 11.6365C2.427 10.3159 4.28678 9.43692 8.00634 7.67888Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.49811 15.5V17.7274C9.49811 20.101 9.49811 21.2878 10.2083 21.4771C10.9185 21.6663 11.6664 20.6789 13.1622 18.7039L13.9981 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
