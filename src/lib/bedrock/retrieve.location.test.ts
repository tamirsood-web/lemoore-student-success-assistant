// Location intent detection and retrieval tests.
//
// Covers: known department lookups, unknown place escalation, and that location
// intent doesn't accidentally fall through to course-date or source scoring.

import { retrieve } from "./retrieve";
import type { RetrievalResult } from "@/types";

async function get(query: string): Promise<RetrievalResult> {
  return retrieve(query);
}

describe("retrieve — location intent", () => {
  it("detects 'where is' as a location intent", async () => {
    const result = await get("Where is Admissions?");
    expect(result.intent).toBe("location");
  });

  it("returns a grounded snippet for Admissions & Records", async () => {
    const result = await get("Where is Admissions?");
    expect(result.snippets.length).toBeGreaterThan(0);
    expect(result.snippets[0]?.source).toBeDefined();
  });

  it("populates locationCard for a known department", async () => {
    const result = await get("Where is Admissions?");
    expect(result.locationCard).toBeDefined();
    expect(result.locationCard?.name).toBe("Admissions & Records");
    expect(result.locationCard?.building).toBeDefined();
    expect(result.locationCard?.hours).toBeDefined();
    expect(result.locationCard?.mapUrl).toBe("https://lemoorecollege.edu/map/");
  });

  it("resolves Financial Aid location", async () => {
    const result = await get("Where do I go for Financial Aid?");
    expect(result.intent).toBe("location");
    expect(result.locationCard?.name).toBe("Financial Aid");
    expect(result.snippets.length).toBeGreaterThan(0);
  });

  it("resolves Counseling location", async () => {
    const result = await get("Where is the Counseling office?");
    expect(result.intent).toBe("location");
    expect(result.locationCard?.name).toBe("Counseling");
  });

  it("resolves Student Services location", async () => {
    const result = await get("Where are student services located?");
    expect(result.intent).toBe("location");
    expect(result.locationCard?.name).toBe("Student Services");
  });

  it("returns empty snippets for an unknown place — safe escalation path", async () => {
    const result = await get("Where is the swimming pool?");
    expect(result.intent).toBe("location");
    expect(result.snippets).toHaveLength(0);
    expect(result.locationCard).toBeUndefined();
  });

  it("does NOT return a comparisonBlock for a location query", async () => {
    const result = await get("Where is Admissions?");
    expect(result.comparisonBlock).toBeUndefined();
  });

  it("returns the campus map URL in the locationCard", async () => {
    const result = await get("Where is the Financial Aid office?");
    expect(result.locationCard?.mapUrl).toBe("https://lemoorecollege.edu/map/");
  });
});
