"use client";

import Link from "next/link";
import { useState } from "react";
import { SearchModal } from "@/features/search";
import { PrototypeBadge } from "./PrototypeBadge";

/** Primary navigation. Links resolve to a website search for the topic (demo behavior). */
const NAV_ITEMS: readonly { readonly label: string; readonly href: string }[] = [
  { label: "Admissions", href: "/search?q=admissions" },
  { label: "Financial Aid", href: "/search?q=financial%20aid" },
  { label: "Registration", href: "/search?q=registration" },
  { label: "Counseling", href: "/search?q=counseling" },
  { label: "Library", href: "/search?q=library" },
];

function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 3 1 8l11 5 9-4.1V15h2V8L12 3Z" />
          <path d="M5 12.4V16c0 1.7 3.1 3 7 3s7-1.3 7-3v-3.6l-7 3.2-7-3.2Z" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold text-foreground">
          Lemoore College
        </span>
        <span className="block text-xs text-muted-foreground">
          Student Success Portal
        </span>
      </span>
    </Link>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/** Responsive site header: logo, primary nav, prototype badge, and a search trigger. */
export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <Logo />
          <PrototypeBadge className="hidden sm:inline-flex" />
        </div>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <SearchIcon />
            <span className="hidden lg:inline">Search…</span>
          </button>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen ? (
        <nav
          aria-label="Primary mobile"
          className="border-t border-border bg-background px-4 py-2 md:hidden"
        >
          <PrototypeBadge className="my-2 sm:hidden" />
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
