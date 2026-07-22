"use client";

import { useEffect, useId, useState } from "react";
import { ChatContainer } from "./ChatContainer";

function ChatIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3c5 0 9 3.4 9 7.6 0 4.2-4 7.6-9 7.6a10.4 10.4 0 0 1-2.8-.38L4.8 19.8a.6.6 0 0 1-.86-.66l.86-3.2C3.05 14.63 3 12.9 3 10.6 3 6.4 7 3 12 3Z" />
    </svg>
  );
}

function CloseIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export interface FloatingAssistantProps {
  /** Server-validated maximum input length, passed from the layout server component. */
  readonly maxInputChars: number;
}

/**
 * Floating AI Assistant available on every site page. A bottom-right toggle expands a chat
 * panel that reuses the existing {@link ChatContainer} (and therefore the existing
 * POST /api/chat contract) unchanged. Collapses on Escape; mobile-friendly sizing.
 */
export function FloatingAssistant({ maxInputChars }: FloatingAssistantProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {/* Chat panel */}
      <div
        id={panelId}
        role="dialog"
        aria-modal="false"
        aria-label="Lemoore College AI assistant"
        aria-hidden={!open}
        className={`fixed bottom-24 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-96 origin-bottom-right flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-all duration-200 ease-out sm:right-6 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
        style={{ height: "min(70vh, 34rem)" }}
      >
        <header className="flex items-center justify-between gap-2 border-b border-border bg-accent px-4 py-3 text-accent-foreground">
          <div>
            <p className="text-sm font-semibold">Student Success Assistant</p>
            <p className="text-xs opacity-90">Grounded answers with sources</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close assistant"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Mount the chat only once opened, so the input does not autofocus offscreen. */}
          {open ? <ChatContainer maxInputChars={maxInputChars} /> : null}
        </div>
      </div>

      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        className="fixed bottom-5 right-4 z-50 inline-flex h-14 items-center gap-2 rounded-full bg-accent pl-4 pr-5 text-accent-foreground shadow-lg transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:right-6"
      >
        {open ? (
          <CloseIcon className="h-6 w-6" />
        ) : (
          <ChatIcon className="h-6 w-6" />
        )}
        <span className="text-sm font-semibold">
          {open ? "Close" : "Ask AI"}
        </span>
      </button>
    </>
  );
}
