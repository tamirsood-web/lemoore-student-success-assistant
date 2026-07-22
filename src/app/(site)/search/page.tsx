import type { Metadata } from "next";
import { SearchExperience } from "@/features/search";

export const metadata: Metadata = {
  title: "Search — Lemoore College Student Success Portal (Prototype Demo)",
  description:
    "Search official student resources. Demonstration prototype — not the official Lemoore College website.",
};

/** Read a single-valued `q` param, ignoring array/undefined forms. */
function firstQuery(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

// Next.js 15: `searchParams` is provided as a Promise in server components.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialQuery = firstQuery(params.q);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Search the college website
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Results come from a small set of sample, local sources for this
        demonstration prototype.
      </p>
      <div className="mt-6">
        <SearchExperience initialQuery={initialQuery} />
      </div>
    </div>
  );
}
