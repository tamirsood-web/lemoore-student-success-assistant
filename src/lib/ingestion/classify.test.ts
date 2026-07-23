import { describe, it, expect } from "vitest";
import { assessPage, resolveCurrentStatus, MIN_CONTENT_WORDS } from "./classify";
import type { HistoricalSignal } from "./historical";

const current: HistoricalSignal = { historical: false, reasons: [] };
const stale: HistoricalSignal = {
  historical: true,
  reasons: ["references academic year 2019, older than current"],
  detectedYear: 2019,
};

const okPage = {
  httpOk: true,
  title: "Financial Aid",
  wordCount: MIN_CONTENT_WORDS + 10,
  historical: current,
  duplicate: undefined,
  canonicalOffDomain: false,
};

describe("resolveCurrentStatus", () => {
  it("never marks a historical page as current", () => {
    expect(resolveCurrentStatus(stale)).toBe("historical");
  });
  it("marks a fresh page current", () => {
    expect(resolveCurrentStatus(current)).toBe("current");
  });
});

describe("assessPage", () => {
  it("approves a healthy current page", () => {
    const r = assessPage(okPage);
    expect(r.approved).toBe(true);
    expect(r.currentStatus).toBe("current");
  });

  it("excludes an HTTP error", () => {
    const r = assessPage({ ...okPage, httpOk: false });
    expect(r.approved).toBe(false);
    expect(r.exclusionReason).toBe("http-error");
  });

  it("excludes empty/minimal content", () => {
    const r = assessPage({ ...okPage, wordCount: 3 });
    expect(r.approved).toBe(false);
    expect(r.exclusionReason).toBe("empty-or-minimal-content");
  });

  it("excludes a duplicate", () => {
    const r = assessPage({ ...okPage, duplicate: { isDuplicate: true, duplicateOf: "other" } });
    expect(r.approved).toBe(false);
    expect(r.exclusionReason).toBe("duplicate");
  });

  it("excludes a page whose canonical points off-domain", () => {
    const r = assessPage({ ...okPage, canonicalOffDomain: true });
    expect(r.approved).toBe(false);
    expect(r.exclusionReason).toBe("canonical-off-domain");
  });

  it("does not silently mark a stale page current, and excludes it by default", () => {
    const r = assessPage({ ...okPage, historical: stale });
    expect(r.approved).toBe(false);
    expect(r.exclusionReason).toBe("historical-or-stale");
    expect(r.currentStatus).toBe("historical");
  });

  it("allows an explicitly historical page through, still marked historical", () => {
    const r = assessPage({ ...okPage, historical: stale, allowHistorical: true });
    expect(r.approved).toBe(true);
    expect(r.currentStatus).toBe("historical");
  });
});
