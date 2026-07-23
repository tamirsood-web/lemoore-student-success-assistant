import type { ComparisonBlockData } from "@/types";
import { Card } from "@/components/ui";

export interface ComparisonBlockProps {
  readonly comparison: ComparisonBlockData;
}

/**
 * Renders a side-by-side (stacked on mobile) comparison of two related college concepts.
 * Content is grounded only from approved mock sources — no invented policy differences.
 * All values are demo data; never claim official accuracy.
 */
export function ComparisonBlock({ comparison }: ComparisonBlockProps) {
  return (
    <Card className="mt-3">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        {comparison.topic}
      </h3>

      {/* Two-column grid — stacks to one column on small screens */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <OptionPanel
          label={comparison.optionA.label}
          explanation={comparison.optionA.explanation}
          side="a"
        />
        <OptionPanel
          label={comparison.optionB.label}
          explanation={comparison.optionB.explanation}
          side="b"
        />
      </div>

      {comparison.keyDifferences.length > 0 ? (
        <section aria-label="Key differences" className="mt-3">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Key differences
          </h4>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-foreground">
            {comparison.keyDifferences.map((diff) => (
              <li key={diff}>{diff}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-2 text-xs text-muted-foreground">
        Sample demo content — not official Lemoore College policy. Verify details with the relevant office.
      </p>
    </Card>
  );
}

function OptionPanel({
  label,
  explanation,
  side,
}: {
  readonly label: string;
  readonly explanation: string;
  readonly side: "a" | "b";
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        side === "a"
          ? "border-accent/40 bg-accent/5"
          : "border-border bg-background"
      }`}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">{explanation}</p>
    </div>
  );
}
