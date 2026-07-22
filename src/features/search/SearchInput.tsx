"use client";

import { useId, useState, type FormEvent } from "react";

/** Inline magnifier icon (no icon dependency). */
function SearchIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
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

export interface SearchInputProps {
  /** Called with the trimmed query when the form is submitted. */
  readonly onSubmit: (query: string) => void;
  /** Optional live callback on each keystroke (for as-you-type search). */
  readonly onChange?: (query: string) => void;
  readonly defaultValue?: string;
  readonly placeholder?: string;
  readonly autoFocus?: boolean;
  /** Accessible label for the search field. */
  readonly label?: string;
  /** Visual size; `hero` is the large homepage variant. */
  readonly size?: "md" | "hero";
}

/** Accessible website search box: a labeled search form with a submit affordance. */
export function SearchInput({
  onSubmit,
  onChange,
  defaultValue = "",
  placeholder = "Search admissions, financial aid, registration…",
  autoFocus = false,
  label = "Search the college website",
  size = "md",
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const inputId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value.trim());
  };

  const isHero = size === "hero";

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex w-full items-stretch gap-2"
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className="relative flex-1">
        <SearchIcon
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${
            isHero ? "h-5 w-5" : "h-4 w-4"
          }`}
        />
        <input
          id={inputId}
          type="search"
          value={value}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- opt-in only inside the search modal
          autoFocus={autoFocus}
          onChange={(event) => {
            setValue(event.target.value);
            onChange?.(event.target.value);
          }}
          placeholder={placeholder}
          className={`w-full rounded-md border border-border bg-background text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            isHero ? "h-14 pl-11 pr-4 text-base" : "h-10 pl-9 pr-3 text-sm"
          }`}
        />
      </div>
      <button
        type="submit"
        className={`inline-flex items-center justify-center rounded-md bg-accent font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          isHero ? "h-14 px-6 text-base" : "h-10 px-4 text-sm"
        }`}
      >
        Search
      </button>
    </form>
  );
}
