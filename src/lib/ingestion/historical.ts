// Historical / archived / stale detection (pure; server/script-only).
//
// Flags content that must NOT be silently presented as current: archived URL paths, catalog or
// calendar pages tied to a past academic year, and pages whose visible "archived/no longer
// current" language betrays them. This only WARNS — it never rewrites a date or promotes old
// content to current (task: "Do not convert old information into current information").

export type HistoricalSignal = {
  readonly historical: boolean;
  /** Human-readable reasons; empty when the page appears current. */
  readonly reasons: readonly string[];
  /** A detected 4-digit year the content is tied to, if any. */
  readonly detectedYear?: number;
};

const ARCHIVE_PATH_SIGNALS = [
  "/archive", "/archived", "/_zarchive", "/old/", "/previous",
  "/past-", "/legacy", "/history/",
];

const ARCHIVE_TEXT_SIGNALS = [
  "this page is archived",
  "archived content",
  "no longer current",
  "no longer available",
  "for the current",
  "outdated",
  "this version is superseded",
  "previous catalog",
  "prior year",
];

const ACADEMIC_YEAR_RE = /\b(20\d{2})\s*[-–—]\s*(20\d{2}|\d{2})\b/g;
const SINGLE_YEAR_RE = /\b(20\d{2})\b/g;

/** Extract the latest academic-year end found in text/title (e.g. "2022-2023" → 2023). */
function latestReferencedYear(text: string): number | undefined {
  let latest: number | undefined;
  let m: RegExpExecArray | null;
  ACADEMIC_YEAR_RE.lastIndex = 0;
  while ((m = ACADEMIC_YEAR_RE.exec(text)) !== null) {
    const second = m[2] ?? "";
    const end = second.length === 2 ? Number(`20${second}`) : Number(second);
    if (Number.isFinite(end)) latest = latest === undefined ? end : Math.max(latest, end);
  }
  if (latest !== undefined) return latest;
  SINGLE_YEAR_RE.lastIndex = 0;
  while ((m = SINGLE_YEAR_RE.exec(text)) !== null) {
    const y = Number(m[1]);
    if (Number.isFinite(y)) latest = latest === undefined ? y : Math.max(latest, y);
  }
  return latest;
}

/**
 * Assess whether a page looks historical/stale. `currentYear` is the academic reference year
 * (e.g. the ingestion year); a catalog/calendar tied to a year more than one behind it is
 * flagged. `topic` narrows the year check to time-bound documents so an evergreen page that
 * merely mentions an old year is not falsely flagged.
 */
export function assessHistorical(input: {
  readonly url: string;
  readonly title: string;
  readonly text: string;
  readonly topic?: string;
  readonly currentYear: number;
}): HistoricalSignal {
  const reasons: string[] = [];
  const path = safePath(input.url);
  if (ARCHIVE_PATH_SIGNALS.some((sig) => path.includes(sig))) {
    reasons.push("URL path indicates an archived location");
  }

  const haystack = `${input.title}\n${input.text}`.toLowerCase();
  for (const sig of ARCHIVE_TEXT_SIGNALS) {
    if (haystack.includes(sig)) {
      reasons.push(`page text signals archived/outdated content ("${sig}")`);
      break;
    }
  }

  const timeBound = /calendar|catalog|schedule|deadline|census|term|semester/i.test(
    `${input.topic ?? ""} ${input.title}`,
  );
  const detectedYear = latestReferencedYear(`${input.title} ${input.text.slice(0, 4000)}`);
  if (timeBound && detectedYear !== undefined && detectedYear < input.currentYear - 1) {
    reasons.push(
      `time-bound page references academic year ${detectedYear}, older than current (${input.currentYear})`,
    );
  }

  return { historical: reasons.length > 0, reasons, detectedYear };
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
