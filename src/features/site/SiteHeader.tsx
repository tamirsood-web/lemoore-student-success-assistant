"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { InactiveControl } from "./InactiveControl";
import { MAIN_NAV, UTILITY_LINKS } from "./navigation";

const FAQ_SUGGESTIONS = [
  "How do I order my official transcript?",
  "When can I register for classes?",
  "Where can I get tutoring?",
  "How do I contact financial aid?",
  "How much does attendance cost?",
  "How do I apply for graduation?",
  "Where is the academic calendar?",
  "I forgot my student portal password.",
  "What services are available for veterans?",
  "How do I meet with a counselor?",
  "What is dual enrollment?",
  "Where can I find scholarships?",
] as const;

function SearchIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery("");
    // Return focus to trigger after panel closes
    setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  // Auto-focus input when panel opens
  useEffect(() => {
    if (searchOpen) {
      // Small delay to ensure DOM is rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [searchOpen]);

  // Escape key closes the panel
  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchOpen, closeSearch]);

  const executeSearch = useCallback((searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;
    closeSearch();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }, [closeSearch, router]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  return (
    <>
      {/* Utility bar */}
      <div className="hidden bg-lc-navy text-white md:block">
        <div className="mx-auto flex max-w-site items-center justify-between px-4">
          <nav aria-label="District and campuses" className="flex items-center">
            {UTILITY_LINKS.slice(0, 4).map((link, i) => (
              <InactiveControl
                key={link}
                className={`px-3 py-2 text-[0.78rem] font-medium hover:bg-white/10 ${
                  i === 0 ? "text-lc-gold" : "text-white/85"
                }`}
              >
                {link}
              </InactiveControl>
            ))}
          </nav>
          <nav aria-label="Quick links" className="flex items-center">
            {UTILITY_LINKS.slice(4).map((link) => (
              <InactiveControl
                key={link}
                className="px-3 py-2 text-[0.78rem] font-medium text-white/85 hover:bg-white/10"
              >
                {link}
              </InactiveControl>
            ))}
          </nav>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-40 border-b border-lc-line bg-white shadow-sm">
        <div className="mx-auto flex max-w-site items-center justify-between gap-4 px-4 py-3">
          <Logo />

          {/* Desktop main nav */}
          <nav aria-label="Main" className="hidden items-center lg:flex">
            {MAIN_NAV.map((item) => (
              <InactiveControl
                key={item}
                className="whitespace-nowrap rounded px-2 py-2 text-[0.92rem] font-semibold text-lc-ink hover:bg-lc-wash hover:text-lc-blue"
              >
                {item}
              </InactiveControl>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Compact search trigger */}
            <button
              ref={triggerRef}
              type="button"
              onClick={openSearch}
              aria-expanded={searchOpen}
              aria-controls="site-search-panel"
              aria-label="Open site search"
              className="rounded-md p-2 text-lc-slate hover:bg-lc-wash hover:text-lc-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lc-blue"
            >
              <SearchIcon className="h-5 w-5" />
            </button>

            <InactiveControl className="hidden whitespace-nowrap rounded-md bg-lc-gold px-3 py-2 text-sm font-bold text-lc-navy-dark hover:bg-lc-gold-dark sm:inline-block">
              Apply Now
            </InactiveControl>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="rounded-md p-2 text-lc-ink hover:bg-lc-wash lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Expanded search panel */}
        {searchOpen ? (
          <div
            id="site-search-panel"
            role="region"
            aria-label="Site search"
            className="absolute inset-x-0 top-full z-50 bg-white shadow-lg"
          >
            <div className="mx-auto max-w-site px-4 py-6 sm:py-8">
              <h2 className="mb-4 text-center text-lg font-bold text-lc-ink sm:text-xl">
                Search West Hills
              </h2>

              {/* Search form — DS Chat Input + DS Icon Button */}
              <form
                onSubmit={submitSearch}
                className="mx-auto flex max-w-2xl items-center gap-2"
              >
                <div className="chat-input flex-1">
                  <label className="chat-input__label chat-input__label--hidden" htmlFor="site-search-input">
                    Search West Hills
                  </label>
                  <div className="chat-input__field">
                    <svg className="chat-input__icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                      <path d="M15 15L16.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16.9333 19.0252C16.3556 18.4475 16.3556 17.5109 16.9333 16.9333C17.5109 16.3556 18.4475 16.3556 19.0252 16.9333L21.0667 18.9748C21.6444 19.5525 21.6444 20.4891 21.0667 21.0667C20.4891 21.6444 19.5525 21.6444 18.9748 21.0667L16.9333 19.0252Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16.5 9.5C16.5 5.63401 13.366 2.5 9.5 2.5C5.63401 2.5 2.5 5.63401 2.5 9.5C2.5 13.366 5.63401 16.5 9.5 16.5C13.366 16.5 16.5 13.366 16.5 9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <textarea
                      ref={inputRef}
                      className="chat-input__textarea"
                      id="site-search-input"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          submitSearch(e);
                        }
                      }}
                      placeholder="Search..."
                      autoComplete="off"
                      rows={1}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn--primary"
                  aria-label="Search"
                >
                  Search
                </button>
              </form>

              {/* FAQ suggestions — DS Secondary Buttons */}
              <div className="mx-auto mt-6 max-w-2xl">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-lc-slate">
                  Try asking
                </h3>
                <div className="flex flex-wrap gap-2">
                  {FAQ_SUGGESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="btn btn--secondary"
                      style={{ whiteSpace: "normal", textAlign: "left" }}
                      onClick={() => {
                        setQuery(question);
                        executeSearch(question);
                      }}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Close button */}
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close site search"
              className="btn btn--icon absolute right-3 top-3 sm:right-5 sm:top-4"
            >
              <svg className="btn__icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : null}

        {/* Mobile menu panel */}
        {menuOpen ? (
          <div id="mobile-menu" className="border-t border-lc-line bg-white lg:hidden">
            <nav aria-label="Mobile main" className="mx-auto max-w-site px-4 py-3">
              <ul className="divide-y divide-lc-line">
                {MAIN_NAV.map((item) => (
                  <li key={item}>
                    <InactiveControl className="block w-full py-3 text-left text-base font-semibold text-lc-ink">
                      {item}
                    </InactiveControl>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-lc-line pt-3">
                {UTILITY_LINKS.map((link) => (
                  <InactiveControl
                    key={link}
                    className="rounded bg-lc-wash px-3 py-1.5 text-sm text-lc-slate"
                  >
                    {link}
                  </InactiveControl>
                ))}
              </div>
              <InactiveControl className="mt-3 block w-full rounded-md bg-lc-gold py-2.5 text-center text-sm font-bold text-lc-navy-dark">
                Apply Now
              </InactiveControl>
            </nav>
          </div>
        ) : null}
      </header>
    </>
  );
}
