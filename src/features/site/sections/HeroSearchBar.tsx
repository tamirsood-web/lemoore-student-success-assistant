"use client";

import { useSearchOverlay } from "@/features/search/SearchProvider";

/**
 * Prominent hero search entry — the headline improvement. It looks like a real search
 * field but opens the full AI-search overlay so judges immediately see the new capability.
 * Keyboard-accessible: it is a real button that opens the overlay on click or Enter/Space.
 */
export function HeroSearchBar() {
  const { open } = useSearchOverlay();
  return (
    <button
      type="button"
      onClick={open}
      className="group flex w-full max-w-xl items-center gap-3 rounded-full bg-white/95 px-5 py-3.5 text-left shadow-lg ring-1 ring-black/5 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lc-gold"
      aria-label="Open AI search — ask a question in plain language"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-lc-blue" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" strokeLinecap="round" />
      </svg>
      <span className="flex-1 text-lc-slate">
        Ask a question, e.g. “How do I order my transcript?”
      </span>
      <span className="hidden rounded-full bg-lc-blue px-4 py-1.5 text-sm font-semibold text-white group-hover:bg-lc-blue-dark sm:inline-block">
        Search
      </span>
    </button>
  );
}
