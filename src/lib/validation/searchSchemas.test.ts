import { describe, it, expect } from "vitest";
import {
  isApprovedOfficialUrl,
  officialSourceCitationSchema,
  websiteSearchResponseSchema,
} from "./searchSchemas";

describe("isApprovedOfficialUrl", () => {
  it("accepts HTTPS URLs on approved official domains and subdomains", () => {
    expect(isApprovedOfficialUrl("https://lemoorecollege.edu/x")).toBe(true);
    expect(isApprovedOfficialUrl("https://www.lemoorecollege.edu/x")).toBe(true);
    expect(isApprovedOfficialUrl("https://westhillscollege.com/lemoore/")).toBe(true);
    expect(isApprovedOfficialUrl("https://support.whccd.edu/hc")).toBe(true);
  });

  it("rejects HTTP, unknown domains, and look-alike hosts", () => {
    expect(isApprovedOfficialUrl("http://lemoorecollege.edu/x")).toBe(false);
    expect(isApprovedOfficialUrl("https://evil.com")).toBe(false);
    expect(isApprovedOfficialUrl("https://lemoorecollege.edu.evil.com")).toBe(false);
    expect(isApprovedOfficialUrl("not a url")).toBe(false);
  });
});

describe("officialSourceCitationSchema", () => {
  const base = {
    id: "official-transcripts",
    title: "Transcripts",
    excerpt: "Students receive two free transcript requests.",
    url: "https://lemoorecollege.edu/resources/transcripts.php",
  };

  it("accepts a citation to an approved official page", () => {
    expect(officialSourceCitationSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a citation with an off-domain / invented URL", () => {
    const bad = { ...base, url: "https://demo.lemoore-college.example/x" };
    expect(officialSourceCitationSchema.safeParse(bad).success).toBe(false);
  });
});

describe("websiteSearchResponseSchema", () => {
  it("rejects an answered response with no citations", () => {
    const bad = {
      kind: "answered",
      query: "q",
      answer: "a [1]",
      citations: [],
      relatedResults: [],
    };
    expect(websiteSearchResponseSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts an unsupported response", () => {
    const ok = {
      kind: "unsupported",
      query: "q",
      message: "I couldn\u2019t find any official information that matches your question.",
      relatedResults: [],
    };
    expect(websiteSearchResponseSchema.safeParse(ok).success).toBe(true);
  });
});
