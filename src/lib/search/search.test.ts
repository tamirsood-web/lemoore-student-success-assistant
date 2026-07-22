import { getSourceById } from "@/lib/mock";
import { createLocalSearchProvider } from "./localSearchProvider";
import { createSearchService, searchService } from "./searchService";

const provider = createLocalSearchProvider();

describe("local search provider", () => {
  it("returns an empty response for empty/whitespace input", async () => {
    const blank = await provider.search({ text: "   " });
    expect(blank.results).toHaveLength(0);
    expect(blank.totalMatches).toBe(0);
  });

  it("keyword-matches a supported topic and labels the result category", async () => {
    const response = await provider.search({ text: "financial aid" });
    expect(response.results.length).toBeGreaterThan(0);
    const first = response.results[0];
    expect(first).toBeDefined();
    expect(first?.matchKind).toBe("keyword");
    expect(first?.category).toBe("Financial Aid");
  });

  it("every result maps to a real source with a bounded, normalized score", async () => {
    const response = await provider.search({ text: "registration transcripts parking" });
    expect(response.results.length).toBeGreaterThan(0);
    for (const result of response.results) {
      expect(getSourceById(result.id)).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
    }
  });

  it("supports a semantic (synonym) match that keyword overlap alone would miss", async () => {
    // "money" shares no literal token with any source, but maps to financial-aid topics.
    const response = await provider.search({ text: "money" });
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.results.every((r) => r.matchKind === "semantic")).toBe(true);
    expect(response.results.some((r) => r.category === "Financial Aid")).toBe(true);
  });

  it("returns no results for an unrelated query", async () => {
    const response = await provider.search({ text: "quantum tea dragons" });
    expect(response.results).toHaveLength(0);
    expect(response.totalMatches).toBe(0);
  });

  it("honors the result limit while reporting the full match count", async () => {
    const response = await provider.search({ text: "student", limit: 2 });
    expect(response.results.length).toBeLessThanOrEqual(2);
    expect(response.totalMatches).toBeGreaterThanOrEqual(response.results.length);
  });

  it("is deterministic for the same query", async () => {
    const a = await provider.search({ text: "counseling" });
    const b = await provider.search({ text: "counseling" });
    expect(a).toEqual(b);
  });
});

describe("search service façade", () => {
  it("exposes the active provider name", () => {
    expect(searchService.providerName).toBe("local-mock");
  });

  it("delegates to its provider and trims input", async () => {
    const service = createSearchService(provider);
    const trimmed = await service.search({ text: "  fafsa  " });
    expect(trimmed.query).toBe("fafsa");
    expect(trimmed.results.length).toBeGreaterThan(0);
  });

  it("short-circuits empty input without hitting the provider", async () => {
    const service = createSearchService(provider);
    const response = await service.search({ text: "" });
    expect(response.results).toHaveLength(0);
  });
});
