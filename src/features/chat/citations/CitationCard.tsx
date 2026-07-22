import type { Citation } from "@/types";
import { Card } from "@/components/ui";

function isSafeHttpUri(uri: string): boolean {
  return uri.startsWith("https://") || uri.startsWith("http://");
}

export interface CitationCardProps {
  readonly citation: Citation;
}

/** A single source citation. Title links out when a safe URI is present; never shows the raw source id. */
export function CitationCard({ citation }: CitationCardProps) {
  const linkable = citation.uri !== undefined && isSafeHttpUri(citation.uri);
  return (
    <Card className="p-3">
      {linkable ? (
        <a
          href={citation.uri}
          target="_blank"
          rel="noopener noreferrer"
          className="break-words font-medium text-accent underline underline-offset-2"
        >
          {citation.title}
        </a>
      ) : (
        <span className="break-words font-medium text-foreground">
          {citation.title}
        </span>
      )}
      {citation.excerpt ? (
        <p className="mt-1 break-words text-sm text-muted-foreground">
          {citation.excerpt}
        </p>
      ) : null}
    </Card>
  );
}
