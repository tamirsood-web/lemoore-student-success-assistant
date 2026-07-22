"use client";

import { useRouter } from "next/navigation";
import { SearchInput } from "./SearchInput";

/** Hero search box on the homepage. Submitting navigates to the full /search results page. */
export function HomeHeroSearch() {
  const router = useRouter();
  return (
    <SearchInput
      size="hero"
      label="Search the college website"
      placeholder="Search FAFSA, registration, transcripts, parking…"
      onSubmit={(query) => {
        const text = query.trim();
        if (text.length === 0) {
          router.push("/search");
          return;
        }
        router.push(`/search?q=${encodeURIComponent(text)}`);
      }}
    />
  );
}
