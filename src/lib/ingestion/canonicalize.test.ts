import { describe, it, expect } from "vitest";
import {
  canonicalizeUrl,
  stripTrackingParams,
  isSameCanonicalUrl,
  tryCanonicalizeUrl,
} from "./canonicalize";

describe("canonicalizeUrl", () => {
  it("upgrades http to https and lowercases the host", () => {
    expect(canonicalizeUrl("http://LemooreCollege.edu/admissions/")).toBe(
      "https://lemoorecollege.edu/admissions/",
    );
  });

  it("removes the fragment", () => {
    expect(canonicalizeUrl("https://lemoorecollege.edu/admissions/#apply")).toBe(
      "https://lemoorecollege.edu/admissions/",
    );
  });

  it("strips tracking query parameters (utm_*, gclid, fbclid, session ids)", () => {
    const url =
      "https://lemoorecollege.edu/admissions/?utm_source=x&utm_medium=y&gclid=abc&fbclid=z&phpsessid=123";
    expect(canonicalizeUrl(url)).toBe("https://lemoorecollege.edu/admissions/");
  });

  it("preserves meaningful query params and sorts them deterministically", () => {
    const a = canonicalizeUrl("https://lemoorecollege.edu/x/?b=2&a=1");
    const b = canonicalizeUrl("https://lemoorecollege.edu/x/?a=1&b=2");
    expect(a).toBe(b);
    expect(a).toContain("a=1");
    expect(a).toContain("b=2");
  });

  it("drops printer-friendly and mobile duplicate-variant params", () => {
    expect(canonicalizeUrl("https://lemoorecollege.edu/x/?print=1")).toBe(
      "https://lemoorecollege.edu/x/",
    );
    expect(canonicalizeUrl("https://lemoorecollege.edu/x/?m=1")).toBe(
      "https://lemoorecollege.edu/x/",
    );
  });

  it("removes default ports and collapses duplicate slashes", () => {
    expect(canonicalizeUrl("https://lemoorecollege.edu:443/a//b/")).toBe(
      "https://lemoorecollege.edu/a/b/",
    );
  });

  it("throws on an unparseable URL", () => {
    expect(() => canonicalizeUrl("not a url")).toThrow();
  });
});

describe("stripTrackingParams", () => {
  it("removes only tracking params, keeping others verbatim", () => {
    const out = stripTrackingParams(
      "https://lemoorecollege.edu/x/?utm_campaign=a&interest-filter=all",
    );
    expect(out).toContain("interest-filter=all");
    expect(out).not.toContain("utm_campaign");
  });
});

describe("isSameCanonicalUrl", () => {
  it("treats tracking-only differences as the same page", () => {
    expect(
      isSameCanonicalUrl(
        "https://lemoorecollege.edu/admissions/",
        "https://lemoorecollege.edu/admissions/?utm_source=news#top",
      ),
    ).toBe(true);
  });

  it("treats different paths as different pages", () => {
    expect(
      isSameCanonicalUrl(
        "https://lemoorecollege.edu/admissions/",
        "https://lemoorecollege.edu/financial-aid/",
      ),
    ).toBe(false);
  });
});

describe("tryCanonicalizeUrl", () => {
  it("returns the original string when unparseable", () => {
    expect(tryCanonicalizeUrl("::::")).toBe("::::");
  });
});
