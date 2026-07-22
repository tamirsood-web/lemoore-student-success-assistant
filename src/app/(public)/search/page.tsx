import { Suspense } from "react";
import { SearchResultsView } from "@/features/search/SearchResultsView";

export const metadata = {
  title: "Search — Lemoore College (Prototype Demo)",
};

// Server page. `useSearchParams` inside SearchResultsView requires a Suspense boundary.
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-10 text-lc-slate">Loading search…</div>
      }
    >
      <SearchResultsView />
    </Suspense>
  );
}
