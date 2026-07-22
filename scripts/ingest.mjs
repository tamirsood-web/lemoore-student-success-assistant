#!/usr/bin/env node
// Official-source ingestion / refresh utility.
//
// This script maintains the curated corpus under `data/lemoore/`. It is intentionally
// controlled and conservative — it does NOT scrape live on every search, and it will not
// invent content. Its jobs:
//
//   • validate   — verify every page JSON is well-formed, HTTPS, on an approved domain,
//                  and has non-empty content + chunks (run in CI / before a demo).
//   • manifest   — regenerate data/lemoore/manifest.json from the page files.
//   • refresh    — re-fetch approved pages to update content (opt-in, rate-limited).
//
// Ingestion rules (enforced / documented):
//   - Only approved official domains are crawled (APPROVED_DOMAINS below).
//   - A polite delay is applied between requests (REQUEST_DELAY_MS).
//   - Authentication-protected and student-specific pages are never fetched.
//   - Canonical source URLs are preserved; navigation/boilerplate should be stripped.
//   - Duplicate ids are rejected.
//   - On any fetch/parse failure the page is reported as NEEDS INGESTION and the existing
//     verified content is left untouched — content is never fabricated.
//
// Usage:
//   node scripts/ingest.mjs validate
//   node scripts/ingest.mjs manifest
//   node scripts/ingest.mjs refresh            (network; re-fetches listed pages)

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data", "lemoore");
const PAGES_DIR = join(DATA_DIR, "pages");

const APPROVED_DOMAINS = ["lemoorecollege.edu", "westhillscollege.com", "whccd.edu"];
const REQUEST_DELAY_MS = 1500;

function isApproved(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return APPROVED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function loadPages() {
  return readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({ file, data: JSON.parse(readFileSync(join(PAGES_DIR, file), "utf8")) }));
}

function validate() {
  const pages = loadPages();
  const ids = new Set();
  let errors = 0;
  for (const { file, data } of pages) {
    const problems = [];
    if (!data.id) problems.push("missing id");
    if (ids.has(data.id)) problems.push(`duplicate id ${data.id}`);
    ids.add(data.id);
    if (!isApproved(data.url)) problems.push(`URL not HTTPS/approved: ${data.url}`);
    if (data.sourceType !== "official-web-page") problems.push("sourceType must be official-web-page");
    if (!data.content || !data.content.trim()) problems.push("empty content");
    if (!Array.isArray(data.chunks) || data.chunks.length === 0) problems.push("no chunks");
    if (problems.length) {
      errors++;
      console.error(`✗ ${file}: ${problems.join("; ")}`);
    } else {
      console.log(`✓ ${file} (${data.chunks.length} chunks) ${data.url}`);
    }
  }
  console.log(`\n${pages.length} pages, ${errors} error(s).`);
  if (errors) process.exit(1);
}

function manifest() {
  const pages = loadPages().map(({ file, data }) => ({
    id: data.id,
    title: data.title,
    url: data.url,
    department: data.department,
    topic: data.topic,
    file: `pages/${file}`,
    chunks: data.chunks.length,
  }));
  const out = {
    name: "Lemoore College official-source corpus",
    description:
      "Curated pages ingested from approved official domains for the AI website search + assistant. Prototype demo — not the official website.",
    approvedDomains: APPROVED_DOMAINS,
    pageCount: pages.length,
    chunkCount: pages.reduce((s, p) => s + p.chunks, 0),
    pages,
  };
  writeFileSync(join(DATA_DIR, "manifest.json"), JSON.stringify(out, null, 2));
  console.log(`Wrote manifest.json: ${pages.length} pages, ${out.chunkCount} chunks.`);
}

async function refresh() {
  const pages = loadPages();
  console.log(
    "Refresh mode re-fetches approved pages with a polite delay. Review diffs before " +
      "committing; content is only updated when a fetch succeeds and stays on-domain.\n",
  );
  for (const { file, data } of pages) {
    if (!isApproved(data.url)) {
      console.error(`SKIP ${file}: URL not approved (${data.url})`);
      continue;
    }
    try {
      const res = await fetch(data.url, { headers: { "user-agent": "LemooreDemoIngest/1.0" } });
      if (!res.ok) {
        console.error(`NEEDS INGESTION ${file}: HTTP ${res.status}`);
      } else {
        // Extraction of meaningful text + rechunking is left to the maintainer to review;
        // this script never overwrites verified content with unreviewed HTML.
        console.log(`OK ${file}: fetched ${data.url} (${res.status}). Review + update manually.`);
      }
    } catch (err) {
      console.error(`NEEDS INGESTION ${file}: ${err instanceof Error ? err.message : err}`);
    }
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }
}

const cmd = process.argv[2] ?? "validate";
if (cmd === "validate") validate();
else if (cmd === "manifest") manifest();
else if (cmd === "refresh") await refresh();
else {
  console.error(`Unknown command "${cmd}". Use: validate | manifest | refresh`);
  process.exit(1);
}
