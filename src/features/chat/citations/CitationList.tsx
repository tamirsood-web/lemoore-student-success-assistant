import type { Citation } from "@/types";
import { CitationCard } from "./CitationCard";

export interface CitationListProps {
  readonly citations: readonly Citation[];
}

/** Renders a separated "Sources" area, or nothing when there are no citations. */
export function CitationList({ citations }: CitationListProps) {
  if (citations.length === 0) return null;
  return (
    <section aria-label="Sources" className="mt-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sources
      </h3>
      <ul className="flex flex-col gap-2">
        {citations.map((citation) => (
          <li key={citation.sourceId}>
            <CitationCard citation={citation} />
          </li>
        ))}
      </ul>
    </section>
  );
}
