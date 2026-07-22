import type { SearchResult } from "@/types";
import { Card, Spinner } from "@/components/ui";
import type { SearchStatus } from "./useWebsiteSearch";

function isSafeHttpUri(uri: string): boolean {
  return uri.startsWith("https://") || uri.startsWith("http://");
}

/** One clickable result. Links out when a safe URI is present; otherwise a static card. */
function ResultItem({ result }: { readonly result: SearchResult }) {
  const linkable = result.url !== undefined && isSafeHttpUri(result.url);
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {result.category}
        </span>
        {result.matchKind === "semantic" ? (
          <span className="inline-flex rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">
            Related
          </span>
        ) : null}
      </div>
      <h3 className="mt-1 break-words font-medium text-accent underline-offset-2 group-hover:underline">
        {result.title}
      </h3>
      <p className="mt-1 break-words text-sm text-muted-foreground">
        {result.snippet}
      </p>
    </>
  );

  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      {linkable ? (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {body}
        </a>
      ) : (
        <div className="group">{body}</div>
      )}
    </Card>
  );
}

export interface SearchResultsProps {
  readonly status: SearchStatus;
}

/** Renders the four search states: loading, error, empty, and a results list. */
export function SearchResults({ status }: SearchResultsProps) {
  if (status.kind === "idle") return null;

  if (status.kind === "loading") {
    return (
      <div className="py-6">
        <Spinner label={`Searching for “${status.query}”…`} />
      </div>
    );
  }

  if (status.kind === "error") {
    return (
      <p role="alert" className="py-6 text-sm text-foreground">
        {status.message}
      </p>
    );
  }

  const { response } = status;
  if (response.results.length === 0) {
    return (
      <div className="py-6" aria-live="polite">
        <p className="text-sm font-medium text-foreground">
          No results for “{response.query}”.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try different keywords, or ask the AI assistant in the bottom-right
          corner for a grounded answer with sources.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Search results" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {response.totalMatches} result{response.totalMatches === 1 ? "" : "s"} for
        “{response.query}”
      </p>
      <ul className="flex flex-col gap-3">
        {response.results.map((result) => (
          <li key={result.id}>
            <ResultItem result={result} />
          </li>
        ))}
      </ul>
    </section>
  );
}
