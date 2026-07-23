import { describe, it, expect } from "vitest";
import { validateManifest, enabledRecords, type SourceRecord } from "./manifest";

const good: SourceRecord = {
  url: "https://lemoorecollege.edu/admissions/financial-aid/",
  topic: "financial-aid",
  department: "Financial Aid",
  priority: "critical",
  sourceType: "official-web-page",
  expectedTitle: "Financial Aid",
  enabled: true,
};

describe("validateManifest", () => {
  it("accepts a well-formed manifest object", () => {
    const result = validateManifest({ sources: [good] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.records).toHaveLength(1);
  });

  it("accepts a bare array manifest", () => {
    const result = validateManifest([good]);
    expect(result.ok).toBe(true);
  });

  it("rejects a record with a missing/empty source URL", () => {
    const result = validateManifest({ sources: [{ ...good, url: "" }] });
    expect(result.ok).toBe(false);
  });

  it("rejects an off-domain source URL", () => {
    const result = validateManifest({ sources: [{ ...good, url: "https://evil.com/x" }] });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-HTTPS source URL", () => {
    const result = validateManifest({ sources: [{ ...good, url: "http://lemoorecollege.edu/x" }] });
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown source type", () => {
    const result = validateManifest({ sources: [{ ...good, sourceType: "blog-post" }] });
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate URLs", () => {
    const result = validateManifest({ sources: [good, { ...good }] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(" ")).toMatch(/duplicate/i);
  });
});

describe("keywords + companion", () => {
  it("accepts a record with keywords and a companion payload", () => {
    const result = validateManifest({
      sources: [
        {
          ...good,
          keywords: ["tuition", "fees"],
          companion: { body: "## Verified contact\nPhone: (559) 925-3000", currentStatus: "current" },
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.records[0]?.keywords).toEqual(["tuition", "fees"]);
      expect(result.records[0]?.companion?.currentStatus).toBe("current");
    }
  });

  it("rejects a companion with an empty body", () => {
    const result = validateManifest({ sources: [{ ...good, companion: { body: "" } }] });
    expect(result.ok).toBe(false);
  });

  it("rejects a companion with an unknown current_status", () => {
    const result = validateManifest({
      sources: [{ ...good, companion: { body: "x", currentStatus: "brand-new" } }],
    });
    expect(result.ok).toBe(false);
  });
});

describe("enabledRecords", () => {
  it("returns only enabled records", () => {
    const records: SourceRecord[] = [
      good,
      { ...good, url: "https://lemoorecollege.edu/schedule/", enabled: false },
    ];
    expect(enabledRecords(records)).toHaveLength(1);
  });
});
