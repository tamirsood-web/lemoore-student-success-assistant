// Human-review report construction: CSV rows + summary JSON (pure; server/script-only).
//
// The review artifacts are the gate before any upload. `ReviewRow` is one line per attempted
// source; `toCsv` renders the exact columns the task requires; `buildSummary` aggregates counts
// (approved, excluded-by-reason, duplicates, stale warnings) so a human can approve at a glance.

export type ReviewRow = {
  readonly sourceUrl: string;
  readonly outputFile: string;
  readonly title: string;
  readonly department: string;
  readonly topic: string;
  readonly sourceType: string;
  readonly httpStatus: number | "" | "error";
  readonly canonicalUrl: string;
  readonly wordCount: number | "";
  readonly duplicateStatus: string;
  readonly historicalWarning: string;
  readonly lastModified: string;
  readonly approvedForUpload: boolean;
  readonly validationErrors: string;
};

/** Column order for the review CSV (stable; consumed by reviewers + spreadsheets). */
export const REVIEW_COLUMNS: Array<{ key: keyof ReviewRow; header: string }> = [
  { key: "sourceUrl", header: "source_url" },
  { key: "outputFile", header: "output_file" },
  { key: "title", header: "title" },
  { key: "department", header: "department" },
  { key: "topic", header: "topic" },
  { key: "sourceType", header: "source_type" },
  { key: "httpStatus", header: "http_status" },
  { key: "canonicalUrl", header: "canonical_url" },
  { key: "wordCount", header: "word_count" },
  { key: "duplicateStatus", header: "duplicate_status" },
  { key: "historicalWarning", header: "historical_warning" },
  { key: "lastModified", header: "last_modified" },
  { key: "approvedForUpload", header: "approved_for_upload" },
  { key: "validationErrors", header: "validation_errors" },
];

function csvEscape(value: string | number | boolean): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Render review rows as a CSV string with a header line. */
export function toCsv(rows: readonly ReviewRow[]): string {
  const header = REVIEW_COLUMNS.map((c) => c.header).join(",");
  const lines = rows.map((row) =>
    REVIEW_COLUMNS.map((c) => csvEscape(row[c.key] as string | number | boolean)).join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}

export type IngestionSummary = {
  readonly generatedAt: string;
  readonly totals: {
    readonly attempted: number;
    readonly cleanedHtml: number;
    readonly preservedPdf: number;
    readonly approvedForUpload: number;
    readonly excluded: number;
    readonly duplicates: number;
    readonly historicalWarnings: number;
    readonly validationErrors: number;
    readonly totalWords: number;
  };
  readonly excludedByReason: Record<string, number>;
  readonly byCategory: Record<string, number>;
  readonly needsManualVerification: string[];
};

/** Aggregate review rows into the summary JSON, given a category lookup for each output file. */
export function buildSummary(
  rows: readonly ReviewRow[],
  options: {
    readonly generatedAt: string;
    readonly categoryOf: (row: ReviewRow) => string;
    readonly exclusionReasonOf: (row: ReviewRow) => string | undefined;
    readonly pdfSourceType?: string;
  },
): IngestionSummary {
  const excludedByReason: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const needsManualVerification: string[] = [];
  let cleanedHtml = 0;
  let preservedPdf = 0;
  let approved = 0;
  let excluded = 0;
  let duplicates = 0;
  let historicalWarnings = 0;
  let validationErrors = 0;
  let totalWords = 0;

  for (const row of rows) {
    if (row.approvedForUpload) {
      approved += 1;
      byCategory[options.categoryOf(row)] = (byCategory[options.categoryOf(row)] ?? 0) + 1;
      if (row.sourceType.includes("pdf") || row.sourceType.includes("document")) preservedPdf += 1;
      else cleanedHtml += 1;
    } else {
      excluded += 1;
      const reason = options.exclusionReasonOf(row) ?? "unspecified";
      excludedByReason[reason] = (excludedByReason[reason] ?? 0) + 1;
    }
    if (row.duplicateStatus && row.duplicateStatus !== "unique") duplicates += 1;
    if (row.historicalWarning) {
      historicalWarnings += 1;
      needsManualVerification.push(row.sourceUrl);
    }
    if (row.validationErrors) validationErrors += 1;
    if (typeof row.wordCount === "number") totalWords += row.wordCount;
  }

  return {
    generatedAt: options.generatedAt,
    totals: {
      attempted: rows.length,
      cleanedHtml,
      preservedPdf,
      approvedForUpload: approved,
      excluded,
      duplicates,
      historicalWarnings,
      validationErrors,
      totalWords,
    },
    excludedByReason,
    byCategory,
    needsManualVerification: Array.from(new Set(needsManualVerification)),
  };
}
