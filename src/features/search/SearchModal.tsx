"use client";

import { useEffect, useRef } from "react";
import { SearchInput } from "./SearchInput";
import { SearchResults } from "./SearchResults";
import { useWebsiteSearch } from "./useWebsiteSearch";

export interface SearchModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * A lightweight search overlay opened from the site header. As-you-type search over the
 * swappable {@link useWebsiteSearch} controller. Closes on Escape or backdrop click, and
 * restores focus on close. Not a full focus-trap — kept intentionally small for the demo.
 */
export function SearchModal({ open, onClose }: SearchModalProps) {
  const { status, run, reset } = useWebsiteSearch();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // Prevent the page behind the overlay from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // Reset results when the modal is dismissed so it reopens clean.
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 px-4 pt-[10vh] backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search the college website"
        className="w-full max-w-2xl rounded-xl border border-border bg-background p-4 shadow-xl"
      >
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchInput
              onSubmit={run}
              onChange={run}
              autoFocus
              placeholder="Search admissions, financial aid, registration…"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-md px-3 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Close
          </button>
        </div>
        <div className="mt-2 max-h-[60vh] overflow-y-auto">
          <SearchResults status={status} />
        </div>
      </div>
    </div>
  );
}
