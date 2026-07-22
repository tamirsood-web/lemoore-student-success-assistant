"use client";

import { useState } from "react";
import { Logo } from "./Logo";
import { InactiveControl } from "./InactiveControl";
import { MAIN_NAV, UTILITY_LINKS } from "./navigation";
import { useSearchOverlay } from "@/features/search/SearchProvider";

function SearchIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader() {
  const { open: openSearch } = useSearchOverlay();
  const [menuOpen, setMenuOpen] = useState(false);

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
            <button
              type="button"
              onClick={openSearch}
              className="ml-1 flex items-center gap-1.5 px-3 py-2 text-[0.78rem] font-semibold text-lc-gold hover:bg-white/10"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              AI Search
            </button>
          </nav>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-40 border-b border-lc-line bg-white shadow-sm">
        <div className="mx-auto flex max-w-site items-center justify-between gap-4 px-4 py-3">
          <Logo />

          {/* Desktop main nav */}
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {MAIN_NAV.map((item) => (
              <InactiveControl
                key={item}
                className="rounded px-3 py-2 text-[0.92rem] font-semibold text-lc-ink hover:bg-lc-wash hover:text-lc-blue"
              >
                {item}
              </InactiveControl>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openSearch}
              className="flex items-center gap-2 rounded-md border border-lc-line px-3 py-2 text-sm font-medium text-lc-slate hover:border-lc-blue hover:text-lc-blue lg:min-w-[150px]"
              aria-label="Open AI search"
            >
              <SearchIcon className="h-4 w-4" />
              <span className="hidden lg:inline">Search…</span>
            </button>
            <InactiveControl className="hidden rounded-md bg-lc-gold px-4 py-2 text-sm font-bold text-lc-navy-dark hover:bg-lc-gold-dark sm:inline-block">
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
