import { describe, it, expect } from "vitest";
import { extractContent } from "./extract";

const BASE = "https://lemoorecollege.edu/admissions/financial-aid/";

const SAMPLE = `<!doctype html>
<html>
<head>
  <title>Financial Aid | Lemoore College</title>
  <link rel="canonical" href="https://lemoorecollege.edu/admissions/financial-aid/">
  <meta name="description" content="How to pay for college.">
  <meta property="article:modified_time" content="2025-09-01">
  <style>.x{color:red}</style>
  <script>window.dataLayer=[];</script>
</head>
<body>
  <header class="site-header"><div class="logo">Lemoore</div>
    <nav aria-label="Main"><ul><li><a href="/">Home</a></li><li><a href="/admissions/">Admissions</a></li></ul></nav>
  </header>
  <div class="cookie-banner">We use cookies. <button>Accept</button></div>
  <main>
    <h1>Financial Aid</h1>
    <span class="sr-only">Skip to content</span>
    <p>Paying for college is <strong>easier</strong> than you think. Visit the <a href="/admissions/financial-aid/apply.php">application page</a> to begin.</p>
    <h2>Steps</h2>
    <ul>
      <li>Submit an admissions application</li>
      <li>Complete the FAFSA or California Dream Act Application</li>
      <li>Set up a Financial Aid Forms account</li>
    </ul>
    <h2>Office hours</h2>
    <table>
      <tr><th>Day</th><th>Hours</th></tr>
      <tr><td>Monday - Friday</td><td>8:00 am - 5:00 pm</td></tr>
    </table>
  </main>
  <aside class="related"><h3>Related</h3><ul><li><a href="/x">Other</a></li></ul></aside>
  <footer class="site-footer"><p>© 2025 Lemoore College. All rights reserved.</p></footer>
</body>
</html>`;

describe("extractContent", () => {
  const result = extractContent(SAMPLE, BASE);

  it("extracts the page title", () => {
    expect(result.title).toBe("Financial Aid | Lemoore College");
  });

  it("extracts canonical URL, description, and last-modified metadata", () => {
    expect(result.canonicalUrl).toBe("https://lemoorecollege.edu/admissions/financial-aid/");
    expect(result.description).toBe("How to pay for college.");
    expect(result.lastModified).toBe("2025-09-01");
  });

  it("keeps main-content headings, prose, and lists", () => {
    expect(result.markdown).toContain("# Financial Aid");
    expect(result.markdown).toContain("## Steps");
    expect(result.markdown).toContain("- Submit an admissions application");
    expect(result.markdown).toContain("Complete the FAFSA");
  });

  it("preserves meaningful link text as Markdown links with absolute URLs", () => {
    expect(result.markdown).toContain(
      "[application page](https://lemoorecollege.edu/admissions/financial-aid/apply.php)",
    );
  });

  it("preserves bold emphasis", () => {
    expect(result.markdown).toContain("**easier**");
  });

  it("converts tables to Markdown", () => {
    expect(result.markdown).toContain("| Day | Hours |");
    expect(result.markdown).toContain("| Monday - Friday | 8:00 am - 5:00 pm |");
  });

  it("removes navigation, header, footer, cookie banner, and aside", () => {
    expect(result.markdown).not.toContain("Home");
    expect(result.markdown).not.toContain("cookies");
    expect(result.markdown).not.toContain("All rights reserved");
    expect(result.markdown).not.toContain("Related");
  });

  it("removes screen-reader-only duplicate text", () => {
    expect(result.markdown).not.toContain("Skip to content");
  });

  it("removes script and style content", () => {
    expect(result.markdown).not.toContain("dataLayer");
    expect(result.markdown).not.toContain("color:red");
  });

  it("reports a positive word count", () => {
    expect(result.wordCount).toBeGreaterThan(20);
  });

  it("falls back to body when there is no <main>", () => {
    const html = `<html><body><h1>Title</h1><p>Some content here that is meaningful.</p></body></html>`;
    const r = extractContent(html, BASE);
    expect(r.markdown).toContain("# Title");
    expect(r.markdown).toContain("Some content here");
  });
});
