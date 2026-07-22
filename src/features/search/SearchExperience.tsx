"use client";

import { useEffect } from "react";
import { SearchInput } from "./SearchInput";
import { SearchResults } from "./SearchResults";
import { useWebsiteSearch } from "./useWebsiteSearch";

/** Popular topics offered as one-click starting points on the search page. */
const POPULAR: readonly string[] = [
  "FAFSA",
  "Registration",
  "Transcripts",
  "Counseling",
  "Parking",
  "Tutoring",
];

export interface SearchExperienceProps {
  /** Query to run on first render (e.g. from a `?q=` deep link). */
  readonly initialQuery?: string;
}

/** Full-page search experience: input, popular topics, and stateful results. */
export function SearchExperience({ initialQuery = "" }: SearchExperienceProps) {
  const { status, run } = useWebsiteSearch();

  useEffect(() => {
    if (initialQuery.trim().length > 0) void run(initialQuery);
    // Run once for the incoming deep-link query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <SearchInput
        onSubmit={run}
        defaultValue={initialQuery}
        size="hero"
        label="Search the college website"
      />

      {status.kind === "idle" ? (
        <section aria-label="Popular searches" className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Popular searches
          </p>
          <ul className="flex flex-wrap gap-2">
            {POPULAR.map((topic) => (
              <li key={topic}>
                <button
                  type="button"
                  onClick={() => void run(topic)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {topic}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SearchResults status={status} />
    </div>
  );
}
