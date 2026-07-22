import { describe, it, expect } from "vitest";
import {
  officialSources,
  corpusChunks,
  getOfficialSourceById,
  OFFICIAL_SOURCE_COUNT,
} from "./corpus";
import { isApprovedOfficialUrl, officialSourceSchema } from "@/lib/validation";

describe("official-source corpus integrity", () => {
  it("loads a non-trivial number of official pages", () => {
    expect(OFFICIAL_SOURCE_COUNT).toBeGreaterThanOrEqual(12);
    expect(officialSources.length).toBe(OFFICIAL_SOURCE_COUNT);
  });

  it("every record validates against the official-source schema", () => {
    for (const source of officialSources) {
      expect(officialSourceSchema.safeParse(source).success).toBe(true);
    }
  });

  it("every source URL is HTTPS on an approved official domain", () => {
    for (const source of officialSources) {
      expect(
        isApprovedOfficialUrl(source.url),
        `off-domain or non-HTTPS URL: ${source.url}`,
      ).toBe(true);
    }
  });

  it("all source ids are unique and resolvable", () => {
    const ids = new Set(officialSources.map((s) => s.id));
    expect(ids.size).toBe(officialSources.length);
    for (const source of officialSources) {
      expect(getOfficialSourceById(source.id)).toBe(source);
    }
  });

  it("every chunk id is prefixed by its parent source id and has text", () => {
    for (const { chunk, source } of corpusChunks) {
      expect(chunk.id.startsWith(source.id)).toBe(true);
      expect(chunk.text.trim().length).toBeGreaterThan(0);
    }
  });

  it("no source content points at an example/demo/placeholder domain", () => {
    for (const source of officialSources) {
      expect(source.url).not.toMatch(/\.example\b|demo\.|localhost/);
    }
  });
});
