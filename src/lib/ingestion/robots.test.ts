import { describe, it, expect } from "vitest";
import { parseRobots, isPathAllowed, isUrlAllowedByRobots } from "./robots";

// The real Lemoore College robots.txt rules (captured during the audit).
const LEMOORE_ROBOTS = `# robots.txt

User-agent: *
Disallow: /_resources/
Disallow: /_catalog/
Disallow: /_training/
Disallow: /_zArchive/
Disallow: /academics/
Disallow: */documents/archived/*.pdf
`;

describe("parseRobots + isPathAllowed", () => {
  const ua = "LemooreStudentAssistantIngest/1.0";

  it("disallows paths listed under the * group", () => {
    const rules = parseRobots(LEMOORE_ROBOTS, ua);
    expect(isPathAllowed(rules, "/academics/biology/")).toBe(false);
    expect(isPathAllowed(rules, "/_zArchive/old.php")).toBe(false);
    expect(isPathAllowed(rules, "/_resources/x.css")).toBe(false);
  });

  it("allows unlisted paths", () => {
    const rules = parseRobots(LEMOORE_ROBOTS, ua);
    expect(isPathAllowed(rules, "/admissions/financial-aid/")).toBe(true);
    expect(isPathAllowed(rules, "/resources/transcripts.php")).toBe(true);
  });

  it("honors wildcard rules (archived PDFs)", () => {
    const rules = parseRobots(LEMOORE_ROBOTS, ua);
    expect(isPathAllowed(rules, "/documents/archived/2019-calendar.pdf")).toBe(false);
    expect(isPathAllowed(rules, "/documents/current-calendar.pdf")).toBe(true);
  });

  it("prefers a specific user-agent group over *", () => {
    const robots = `User-agent: *
Disallow: /

User-agent: LemooreStudentAssistantIngest
Disallow: /private/
`;
    expect(isUrlAllowedByRobots(robots, "LemooreStudentAssistantIngest/1.0", "https://lemoorecollege.edu/public/")).toBe(true);
    expect(isUrlAllowedByRobots(robots, "LemooreStudentAssistantIngest/1.0", "https://lemoorecollege.edu/private/x")).toBe(false);
  });

  it("longest-match precedence: Allow overrides a broader Disallow", () => {
    const robots = `User-agent: *
Disallow: /docs/
Allow: /docs/public/
`;
    const rules = parseRobots(robots, "*");
    expect(isPathAllowed(rules, "/docs/secret.html")).toBe(false);
    expect(isPathAllowed(rules, "/docs/public/guide.html")).toBe(true);
  });

  it("captures sitemap directives", () => {
    const robots = `Sitemap: https://lemoorecollege.edu/sitemap.xml
User-agent: *
Disallow:
`;
    const rules = parseRobots(robots, "*");
    expect(rules.sitemaps).toContain("https://lemoorecollege.edu/sitemap.xml");
    // Empty Disallow means allow-all.
    expect(isPathAllowed(rules, "/anything")).toBe(true);
  });
});
