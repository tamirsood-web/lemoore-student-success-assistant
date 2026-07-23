import { describe, it, expect } from "vitest";
import { buildMarkdownDocument } from "./markdown";

describe("buildMarkdownDocument", () => {
  const doc = buildMarkdownDocument({
    title: "Financial Aid",
    sourceUrl: "https://lemoorecollege.edu/admissions/financial-aid/",
    department: "Financial Aid",
    lastChecked: "2026-07-22",
    topic: "financial-aid",
    content: "Paying for college is easier than you think.",
  });

  it("includes the title as an H1", () => {
    expect(doc.startsWith("# Financial Aid")).toBe(true);
  });

  it("includes the visible source header with the exact source URL preserved", () => {
    expect(doc).toContain("Source URL: https://lemoorecollege.edu/admissions/financial-aid/");
    expect(doc).toContain("Department: Financial Aid");
    expect(doc).toContain("Last checked: 2026-07-22");
  });

  it("includes the cleaned content body", () => {
    expect(doc).toContain("Paying for college is easier than you think.");
  });

  it("emits a historical warning when provided", () => {
    const warned = buildMarkdownDocument({
      title: "Old Catalog",
      sourceUrl: "https://lemoorecollege.edu/catalog/2019-2020/",
      department: "Admissions and Records",
      lastChecked: "2026-07-22",
      historicalWarning: "references academic year 2020, older than current",
      content: "Archived catalog content.",
    });
    expect(warned).toMatch(/Historical\/stale content notice/i);
  });
});
