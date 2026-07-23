import type { Citation } from "@/types";
import { CitationCard } from "./CitationCard";

type Props = { citations: readonly Citation[] };

export function CitationList({ citations }: Props) {
  if (citations.length === 0) return null;
  return (
    <section aria-label="Sources">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources</h3>
      <ol className="flex flex-col gap-2">
        {citations.map((c, i) => (
          <CitationCard key={c.sourceId + i} citation={c} index={i} />
        ))}
      </ol>
    </section>
  );
}
