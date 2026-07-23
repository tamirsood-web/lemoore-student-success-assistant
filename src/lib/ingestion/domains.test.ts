import { describe, it, expect } from "vitest";
import {
  assessCrawlSafety,
  isApprovedOfficialUrl,
  isAuthenticatedPath,
  isAuthenticatedHost,
  isCrawlTrapUrl,
  isAssetUrl,
  isPdfUrl,
} from "./domains";

describe("approved-domain enforcement", () => {
  it("accepts approved official HTTPS domains and subdomains", () => {
    expect(isApprovedOfficialUrl("https://lemoorecollege.edu/x/")).toBe(true);
    expect(isApprovedOfficialUrl("https://www.lemoorecollege.edu/x/")).toBe(true);
    expect(isApprovedOfficialUrl("https://foo.whccd.edu/x/")).toBe(true);
  });

  it("rejects non-HTTPS and off-domain URLs", () => {
    expect(isApprovedOfficialUrl("http://lemoorecollege.edu/x/")).toBe(false);
    expect(isApprovedOfficialUrl("https://evil.com/x/")).toBe(false);
    expect(isApprovedOfficialUrl("https://lemoorecollege.edu.evil.com/x/")).toBe(false);
  });
});

describe("assessCrawlSafety", () => {
  it("allows an ordinary approved page", () => {
    expect(assessCrawlSafety("https://lemoorecollege.edu/admissions/")).toEqual({ allowed: true });
  });

  it("rejects off-domain URLs", () => {
    const v = assessCrawlSafety("https://example.com/");
    expect(v.allowed).toBe(false);
  });

  it("rejects authenticated / student-specific paths", () => {
    expect(assessCrawlSafety("https://lemoorecollege.edu/login").allowed).toBe(false);
    expect(assessCrawlSafety("https://lemoorecollege.edu/account/grades").allowed).toBe(false);
    expect(isAuthenticatedPath("https://lemoorecollege.edu/mywesthills/")).toBe(true);
  });

  it("rejects authenticated portal hosts", () => {
    expect(isAuthenticatedHost("https://my.whccd.edu/")).toBe(true);
    expect(assessCrawlSafety("https://canvas.lemoorecollege.edu/").allowed).toBe(false);
  });

  it("rejects search/calendar/pagination parameter loops", () => {
    expect(isCrawlTrapUrl("https://lemoorecollege.edu/?s=financial+aid")).toBe(true);
    expect(assessCrawlSafety("https://lemoorecollege.edu/events/?cal_date=2030-01").allowed).toBe(false);
    expect(assessCrawlSafety("https://lemoorecollege.edu/list/?page=99").allowed).toBe(false);
  });

  it("rejects non-textual assets but allows PDFs", () => {
    expect(isAssetUrl("https://lemoorecollege.edu/logo.png")).toBe(true);
    expect(assessCrawlSafety("https://lemoorecollege.edu/logo.png").allowed).toBe(false);
    expect(isPdfUrl("https://lemoorecollege.edu/documents/calendar.pdf")).toBe(true);
    expect(assessCrawlSafety("https://lemoorecollege.edu/documents/calendar.pdf").allowed).toBe(true);
  });
});
