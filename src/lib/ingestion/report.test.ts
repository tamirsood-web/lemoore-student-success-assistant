import { describe, it, expect } from "vitest";
import { toCsv, buildSummary, REVIEW_COLUMNS, type ReviewRow } from "./report";

const rows: ReviewRow[] = [
  {
    sourceUrl: "https://lemoorecollege.edu/admissions/financial-aid/",
    outputFile: "financial-aid/financial-aid.md",
    title: "Financial Aid",
    department: "Financial Aid",
    topic: "financial-aid",
    sourceType: "official-web-page",
    httpStatus: 200,
    canonicalUrl: "https://lemoorecollege.edu/admissions/financial-aid/",
    wordCount: 120,
    duplicateStatus: "unique",
    historicalWarning: "",
    lastModified: "2025-09-01",
    approvedForUpload: true,
    validationErrors: "",
  },
  {
    sourceUrl: "https://lemoorecollege.edu/catalog/2019-2020/",
    outputFile: "",
    title: "Catalog 2019-2020, with, commas",
    department: "Admissions and Records",
    topic: "catalog",
    sourceType: "official-web-page",
    httpStatus: 200,
    canonicalUrl: "https://lemoorecollege.edu/catalog/2019-2020/",
    wordCount: 300,
    duplicateStatus: "unique",
    historicalWarning: "references academic year 2020",
    lastModified: "",
    approvedForUpload: false,
    validationErrors: "",
  },
];

describe("toCsv", () => {
  const csv = toCsv(rows);
  it("has the required header columns in order", () => {
    const header = csv.split("\n")[0];
    expect(header).toBe(REVIEW_COLUMNS.map((c) => c.header).join(","));
    expect(header).toContain("source_url");
    expect(header).toContain("approved_for_upload");
    expect(header).toContain("validation_errors");
  });
  it("escapes fields containing commas", () => {
    expect(csv).toContain('"Catalog 2019-2020, with, commas"');
  });
});

describe("buildSummary", () => {
  it("aggregates approved / excluded / historical counts", () => {
    const summary = buildSummary(rows, {
      generatedAt: "2026-07-22T00:00:00.000Z",
      categoryOf: () => "financial-aid",
      exclusionReasonOf: (row) => (row.historicalWarning ? "historical-or-stale" : undefined),
    });
    expect(summary.totals.attempted).toBe(2);
    expect(summary.totals.approvedForUpload).toBe(1);
    expect(summary.totals.excluded).toBe(1);
    expect(summary.totals.historicalWarnings).toBe(1);
    expect(summary.excludedByReason["historical-or-stale"]).toBe(1);
    expect(summary.needsManualVerification).toContain("https://lemoorecollege.edu/catalog/2019-2020/");
    expect(summary.totals.totalWords).toBe(420);
  });
});
