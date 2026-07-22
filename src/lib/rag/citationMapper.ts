// CitationMapper — turn ranked official pages into the citation contract (server-only).
//
// Every citation resolves to a real corpus page: id, official page title, canonical HTTPS
// URL, a verbatim supporting excerpt, and the responsible department. This is the single
// place raw ranking is converted into the `OfficialSourceCitation` wire shape used by both
// website search and the assistant.

import type { OfficialSourceCitation } from "@/types";
import type { RankedSource } from "./reranker";

function excerptFor(ranked: RankedSource): string {
  return ranked.bestChunk.text.replace(/\s+/g, " ").trim();
}

/** Map a single ranked page to a citation. */
export function toCitation(ranked: RankedSource): OfficialSourceCitation {
  return {
    id: ranked.source.id,
    title: ranked.source.title,
    url: ranked.source.url,
    excerpt: excerptFor(ranked),
    department: ranked.source.department,
  };
}

/** Map many ranked pages to citations, preserving order. */
export function toCitations(
  ranked: readonly RankedSource[],
): OfficialSourceCitation[] {
  return ranked.map(toCitation);
}
