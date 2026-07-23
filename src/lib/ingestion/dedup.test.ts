import { describe, it, expect } from "vitest";
import { contentHash, shingleSet, jaccard, detectDuplicates } from "./dedup";

describe("contentHash", () => {
  it("is stable and ignores punctuation/case/whitespace", () => {
    expect(contentHash("Hello, World!")).toBe(contentHash("hello   world"));
  });
  it("differs for different content", () => {
    expect(contentHash("financial aid")).not.toBe(contentHash("academic calendar"));
  });
});

describe("shingleSet + jaccard", () => {
  it("scores identical text as 1", () => {
    const t = "the quick brown fox jumps over the lazy dog again and again";
    expect(jaccard(shingleSet(t), shingleSet(t))).toBe(1);
  });
  it("scores disjoint text near 0", () => {
    const a = shingleSet("apply for financial aid using the fafsa application form online");
    const b = shingleSet("the campus library offers quiet study rooms and research help daily");
    expect(jaccard(a, b)).toBeLessThan(0.1);
  });
});

describe("detectDuplicates", () => {
  it("flags an exact duplicate against the first occurrence", () => {
    const verdicts = detectDuplicates([
      { id: "a", text: "Financial aid helps you pay for college." },
      { id: "b", text: "financial AID helps you pay for college!" },
    ]);
    expect(verdicts[0]?.isDuplicate).toBe(false);
    expect(verdicts[1]?.isDuplicate).toBe(true);
    expect(verdicts[1]?.kind).toBe("exact");
    expect(verdicts[1]?.duplicateOf).toBe("a");
  });

  it("flags a near-duplicate (printer-friendly twin)", () => {
    const base =
      "Financial aid at Lemoore College includes grants, scholarships, loans, and work study. " +
      "Complete the FAFSA or the California Dream Act Application to begin the process today.";
    const twin = base + " Print this page for your records.";
    const verdicts = detectDuplicates([
      { id: "page", text: base },
      { id: "print", text: twin },
    ], 0.6);
    expect(verdicts[1]?.isDuplicate).toBe(true);
    expect(verdicts[1]?.kind).toBe("near");
    expect(verdicts[1]?.duplicateOf).toBe("page");
  });

  it("keeps distinct pages unique", () => {
    const verdicts = detectDuplicates([
      { id: "fa", text: "Apply for financial aid with the FAFSA form and dream act application." },
      { id: "cal", text: "The academic calendar lists census dates, holidays, and the last day to drop." },
    ]);
    expect(verdicts.every((v) => !v.isDuplicate)).toBe(true);
  });
});
