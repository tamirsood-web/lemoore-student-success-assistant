"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { SearchOverlay } from "./SearchOverlay";

type SearchContextValue = {
  readonly open: () => void;
  readonly close: () => void;
  readonly isOpen: boolean;
};

const SearchContext = createContext<SearchContextValue | null>(null);

/**
 * Provides a single shared AI-search overlay for the whole site shell. Any control (header
 * button, hero search box, etc.) can open it via {@link useSearchOverlay}, so there is one
 * overlay instance and one source of open/close state.
 */
export function SearchProvider({ children }: { readonly children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchOverlay open={isOpen} onClose={close} />
    </SearchContext.Provider>
  );
}

/** Access the shared search overlay controls. */
export function useSearchOverlay(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearchOverlay must be used within a SearchProvider");
  }
  return ctx;
}
