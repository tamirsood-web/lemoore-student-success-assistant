import { describe, it, expect } from "vitest";
import { assessHistorical } from "./historical";

describe("assessHistorical", () => {
  const currentYear = 2026;

  it("flags an archived URL path", () => {
    const r = assessHistorical({
      url: "https://lemoorecollege.edu/_zArchive/catalog.php",
      title: "Old Catalog",
      text: "Some content.",
      currentYear,
    });
    expect(r.historical).toBe(true);
    expect(r.reasons.join(" ")).toMatch(/archived/i);
  });

  it("flags a time-bound catalog tied to an old academic year", () => {
    const r = assessHistorical({
      url: "https://lemoorecollege.edu/catalog/2019-2020/",
      title: "Catalog 2019-2020",
      text: "This catalog covers the 2019-2020 academic year.",
      topic: "catalog",
      currentYear,
    });
    expect(r.historical).toBe(true);
    expect(r.detectedYear).toBe(2020);
  });

  it("flags pages whose text signals archived content", () => {
    const r = assessHistorical({
      url: "https://lemoorecollege.edu/x/",
      title: "Notice",
      text: "This page is archived. Please see the current page instead.",
      currentYear,
    });
    expect(r.historical).toBe(true);
  });

  it("does NOT flag an evergreen page that merely mentions an old year", () => {
    const r = assessHistorical({
      url: "https://lemoorecollege.edu/admissions/financial-aid/",
      title: "Financial Aid",
      text: "The financial aid office opened in 2005 and helps students apply for the FAFSA.",
      topic: "financial-aid",
      currentYear,
    });
    expect(r.historical).toBe(false);
  });

  it("does NOT flag a current-year calendar", () => {
    const r = assessHistorical({
      url: "https://lemoorecollege.edu/academic-calendar/",
      title: "Academic Calendar 2026-2027",
      text: "Important dates for the 2026-2027 academic year.",
      topic: "academic-calendar",
      currentYear,
    });
    expect(r.historical).toBe(false);
  });
});
