import { ExternalLink, FileText, Database, Globe } from "lucide-react";
import { Badge } from "@/components/Badge";
import type { Citation } from "@/types";

type Props = { citation: Citation; index: number };

export function CitationCard({ citation, index }: Props) {
  const sourceIcon = citation.sourceType === "s3" ? Database : Globe;
  const SourceIcon = sourceIcon;

  return (
    <li className="flex gap-3 rounded-md border border-border bg-background p-3">
      <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <FileText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            {citation.uri ? (
              <a
                href={citation.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {citation.title}
                <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
                <span className="sr-only">(opens in new tab)</span>
              </a>
            ) : (
              <span className="text-sm font-medium text-foreground">{citation.title}</span>
            )}
            {citation.sourceType && citation.sourceType !== "unknown" && (
              <Badge variant="outline" className="ml-2 inline-flex items-center gap-1 text-[10px]">
                <SourceIcon className="h-3 w-3" aria-hidden="true" />
                {citation.sourceType === "s3" ? "Document" : "Web"}
              </Badge>
            )}
          </div>
        </div>
        {citation.excerpt && (
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{citation.excerpt}</p>
        )}
      </div>
    </li>
  );
}
