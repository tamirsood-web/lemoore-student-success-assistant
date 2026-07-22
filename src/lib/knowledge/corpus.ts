// Curated official-source corpus (server-only).
//
// This is the single retrieval collection shared by website search and the floating
// assistant. It is built from `data/lemoore/pages/*.json` — real pages ingested from
// approved official domains — via the generated static barrel, so there is NO runtime
// filesystem or network access (works identically in tests, dev, and build).
//
// Every record is validated against `officialSourceSchema` at module load, which enforces
// the approved-domain + HTTPS invariant. A malformed or off-domain record fails fast here
// rather than silently reaching a citation.

import type { OfficialChunk, OfficialSource } from "@/types";
import { officialSourceSchema } from "@/lib/validation";
import { OFFICIAL_PAGE_RECORDS } from "./pages.generated";

/** A chunk paired with the source page it belongs to (retrieval unit). */
export type CorpusChunk = {
  readonly chunk: OfficialChunk;
  readonly source: OfficialSource;
};

function validateCorpus(
  records: readonly OfficialSource[],
): readonly OfficialSource[] {
  const seen = new Set<string>();
  const validated: OfficialSource[] = [];
  for (const record of records) {
    const result = officialSourceSchema.safeParse(record);
    if (!result.success) {
      throw new Error(
        `Invalid official source "${record?.id ?? "<unknown>"}": ${result.error.issues
          .map((i) => `${i.path.join(".")} ${i.message}`)
          .join("; ")}`,
      );
    }
    if (seen.has(result.data.id)) {
      throw new Error(`Duplicate official source id "${result.data.id}".`);
    }
    seen.add(result.data.id);
    validated.push(result.data);
  }
  return validated;
}

/** All official source pages, validated. */
export const officialSources: readonly OfficialSource[] =
  validateCorpus(OFFICIAL_PAGE_RECORDS);

/** Lookup map from source id to record. */
export const officialSourceById: ReadonlyMap<string, OfficialSource> = new Map(
  officialSources.map((s) => [s.id, s]),
);

/** Flattened chunk index (each chunk carries its parent source) for retrieval. */
export const corpusChunks: readonly CorpusChunk[] = officialSources.flatMap(
  (source) => source.chunks.map((chunk) => ({ chunk, source })),
);

/** Return a source by id, or undefined if unknown. */
export function getOfficialSourceById(id: string): OfficialSource | undefined {
  return officialSourceById.get(id);
}

/** Total number of ingested official pages. */
export const OFFICIAL_SOURCE_COUNT = officialSources.length;

/** Total number of retrievable chunks across the corpus. */
export const OFFICIAL_CHUNK_COUNT = corpusChunks.length;
