// A single official-source citation: number, official page title, department, a verbatim
// supporting excerpt, and a WORKING "Open official source" link (part of the core demo —
// these links are real and must function). Opens in a new tab with safe rel attributes.

import type { OfficialSourceCitation } from "@/types";

export function CitationCard({
  citation,
  index,
}: {
  readonly citation: OfficialSourceCitation;
  readonly index: number;
}) {
  return (
    <li className="rounded-lg border border-lc-line bg-white p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lc-blue text-xs font-bold text-white"
        >
          {index}
        </span>
        <div className="min-w-0">
          <p className="font-semibold leading-snug text-lc-ink">
            {citation.title}
          </p>
          {citation.department ? (
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-lc-slate">
              {citation.department}
            </p>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed text-lc-slate">
            “{citation.excerpt}”
          </p>
          {citation.url ? (
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-lc-blue hover:text-lc-blue-dark hover:underline"
            >
              Open official source
              <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-lc-slate">
              Official source document
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
