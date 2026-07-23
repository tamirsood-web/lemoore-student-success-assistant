import { describe, it, expect } from "vitest";
import {
  parseSitemap,
  extractLinks,
  guessTopicDepartment,
  classifyCandidate,
} from "./discovery";

describe("parseSitemap", () => {
  it("extracts loc + lastmod entries", () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://lemoorecollege.edu/admissions/</loc><lastmod>2024-12-11</lastmod></url>
      <url><loc>https://lemoorecollege.edu/schedule/</loc></url>
    </urlset>`;
    const entries = parseSitemap(xml);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({ loc: "https://lemoorecollege.edu/admissions/", lastmod: "2024-12-11" });
    expect(entries[1]?.loc).toBe("https://lemoorecollege.edu/schedule/");
  });

  it("decodes XML entities in loc", () => {
    const xml = `<urlset><url><loc>https://lemoorecollege.edu/x/?a=1&amp;b=2</loc></url></urlset>`;
    expect(parseSitemap(xml)[0]?.loc).toBe("https://lemoorecollege.edu/x/?a=1&b=2");
  });
});

describe("extractLinks", () => {
  it("returns absolute http(s) links and skips mailto/tel/js/anchors", () => {
    const html = `<a href="/admissions/">A</a><a href="mailto:x@y.com">M</a>
      <a href="tel:5551234">T</a><a href="#top">Top</a>
      <a href="https://whccd.edu/board/">Board</a>`;
    const links = extractLinks(html, "https://lemoorecollege.edu/");
    expect(links).toContain("https://lemoorecollege.edu/admissions/");
    expect(links).toContain("https://whccd.edu/board/");
    expect(links.some((l) => l.startsWith("mailto"))).toBe(false);
    expect(links.some((l) => l.startsWith("tel"))).toBe(false);
  });
});

describe("guessTopicDepartment", () => {
  it("maps a financial-aid URL", () => {
    expect(guessTopicDepartment("https://lemoorecollege.edu/admissions/financial-aid/")).toEqual({
      topic: "financial-aid",
      department: "Financial Aid",
    });
  });
  it("returns unknown for an unmappable URL", () => {
    expect(guessTopicDepartment("https://lemoorecollege.edu/about/mission/").topic).toBe("unknown");
  });
});

describe("classifyCandidate", () => {
  const currentYear = 2026;

  it("recommends including a new approved student-info page", () => {
    const c = classifyCandidate({
      url: "https://lemoorecollege.edu/resources/transfer-center/",
      referrer: "https://lemoorecollege.edu/resources/",
      detectedTitle: "Transfer Center",
      httpStatus: 200,
      existingCanonicalUrls: [],
      currentYear,
    });
    expect(c.recommendation).toBe("include");
    expect(c.likelyTopic).toBe("transfer");
  });

  it("recommends excluding a disallowed/authenticated URL", () => {
    const c = classifyCandidate({
      url: "https://lemoorecollege.edu/login",
      referrer: "https://lemoorecollege.edu/",
      existingCanonicalUrls: [],
      currentYear,
    });
    expect(c.recommendation).toBe("exclude");
  });

  it("flags a duplicate of an existing manifest URL", () => {
    const c = classifyCandidate({
      url: "https://lemoorecollege.edu/admissions/?utm_source=x",
      referrer: "https://lemoorecollege.edu/",
      detectedTitle: "Admissions",
      httpStatus: 200,
      existingCanonicalUrls: ["https://lemoorecollege.edu/admissions/"],
      currentYear,
    });
    expect(c.duplicateWarning).not.toBe("");
    expect(c.recommendation).toBe("exclude");
  });

  it("flags an archived candidate as historical", () => {
    const c = classifyCandidate({
      url: "https://lemoorecollege.edu/_zArchive/old.php",
      referrer: "https://lemoorecollege.edu/",
      detectedTitle: "Old",
      existingCanonicalUrls: [],
      currentYear,
    });
    expect(c.recommendation).toBe("exclude");
  });
});
