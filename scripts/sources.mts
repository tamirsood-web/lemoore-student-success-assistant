// Lemoore College content-ingestion CLI — SERVER/SCRIPT-ONLY.
//
//   npm run sources:discover     # inspect sitemap/links → candidate report (no upload)
//   npm run sources:build        # download + clean enabled manifest entries → local output
//   npm run sources:validate     # validate produced files/metadata/rules (no AWS)
//   npm run sources:review       # (re)generate human review report (no AWS)
//   npm run sources:upload       # upload approved files to existing S3 prefix (dry-run default)
//   npm run sources:sync         # start ingestion for existing KB data source (dry-run default)
//   npm run sources:evaluate     # retrieve against the KB and print privacy-safe results
//
// Safety: crawling is limited to approved domains, respects robots.txt, uses a descriptive
// user agent and a polite per-host delay, and never touches authenticated/student content.
// `upload` and `sync` DEFAULT TO DRY-RUN and require an explicit `--confirm` flag plus complete
// configuration before performing any AWS write. The app's Knowledge Base, bucket, IAM, and
// data source are never created, replaced, or deleted here. No Git commands are used.

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  rmSync,
} from "node:fs";
import { resolve, join, dirname, relative } from "node:path";

import {
  validateManifest,
  enabledRecords,
  assessCrawlSafety,
  parseRobots,
  isPathAllowed,
  canonicalizeUrl,
  tryCanonicalizeUrl,
  isSameCanonicalUrl,
  isApprovedOfficialUrl,
  isPdfUrl,
  extractContent,
  detectDuplicates,
  assessHistorical,
  assessPage,
  categoryForRecord,
  baseNameFromUrl,
  uniqueName,
  metadataFileName,
  buildMarkdownDocument,
  buildMetadataSidecar,
  metadataSidecarSchema,
  toCsv,
  buildSummary,
  parseSitemap,
  extractLinks,
  classifyCandidate,
  isConfirmed,
  resolveUploadDecision,
  resolveSyncDecision,
  type SourceRecord,
  type ReviewRow,
  type CurrentStatus,
} from "../src/lib/ingestion/index.ts";

// ---- Configuration & paths ---------------------------------------------------------------

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, "data", "ingestion", "lemoore-sources.json");
const EVAL_PATH = join(ROOT, "data", "ingestion", "eval-questions.json");
const OUTPUT_DIR = join(ROOT, "data", "bedrock", "lemoore");
const REPORTS_DIR = join(ROOT, "reports");

const USER_AGENT =
  "LemooreStudentAssistantIngest/1.0 (+https://lemoorecollege.edu; AI Student Success Assistant prototype)";
const REQUEST_DELAY_MS = clampInt(process.env.INGEST_REQUEST_DELAY_MS, 500, 10000, 800);
const MAX_RETRIES = 2;
const CURRENT_YEAR = clampInt(process.env.INGEST_CURRENT_YEAR, 2000, 2100, 2026);
const NOW_ISO = process.env.INGEST_NOW ?? new Date().toISOString();
const TODAY = NOW_ISO.slice(0, 10);

function clampInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Minimal .env loader (mirrors verify-bedrock.mts). Never overwrites already-set vars.
function loadEnvFile(file: string): void {
  const path = resolve(ROOT, file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
    if (!m) continue;
    const key = m[1] as string;
    let value = (m[2] ?? "").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function writeJson(path: string, data: unknown): void {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

// ---- Polite HTTP fetching ----------------------------------------------------------------

type FetchResult = {
  ok: boolean;
  status: number | "error";
  finalUrl: string;
  contentType: string;
  lastModified: string | undefined;
  body?: string;
  bytes?: Uint8Array;
  error?: string;
};

const robotsCache = new Map<string, ReturnType<typeof parseRobots>>();

async function getRobots(origin: string): Promise<ReturnType<typeof parseRobots>> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;
  let rules = parseRobots("", USER_AGENT);
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "user-agent": USER_AGENT } });
    if (res.ok) rules = parseRobots(await res.text(), USER_AGENT);
  } catch {
    // No robots or fetch failure: default to the empty (allow-all) ruleset, but crawl-safety
    // rules still apply. A hard network failure on the page itself is handled per-request.
  }
  robotsCache.set(origin, rules);
  return rules;
}

async function politeFetch(url: string, opts: { binary?: boolean } = {}): Promise<FetchResult> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT, accept: opts.binary ? "application/pdf,*/*" : "text/html,*/*" },
        redirect: "follow",
      });
      const status = res.status;
      if ((status === 429 || status === 503) && attempt < MAX_RETRIES) {
        const retryAfter = Number.parseInt(res.headers.get("retry-after") ?? "", 10);
        const wait = Number.isFinite(retryAfter) ? retryAfter * 1000 : (attempt + 1) * 1500;
        await sleep(wait);
        attempt += 1;
        continue;
      }
      const contentType = res.headers.get("content-type") ?? "";
      const lastModified = res.headers.get("last-modified") ?? undefined;
      const finalUrl = res.url || url;
      if (!res.ok) {
        return { ok: false, status, finalUrl, contentType, lastModified };
      }
      if (opts.binary) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        return { ok: true, status, finalUrl, contentType, lastModified, bytes };
      }
      const body = await res.text();
      return { ok: true, status, finalUrl, contentType, lastModified, body };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep((attempt + 1) * 1500);
        attempt += 1;
        continue;
      }
      return {
        ok: false,
        status: "error",
        finalUrl: url,
        contentType: "",
        lastModified: undefined,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

function loadManifestOrExit(): SourceRecord[] {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`Manifest not found: ${relative(ROOT, MANIFEST_PATH)}`);
    process.exit(1);
  }
  const result = validateManifest(readJson(MANIFEST_PATH));
  if (!result.ok) {
    console.error("Manifest is invalid:");
    for (const issue of result.issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  return result.records;
}

// ---- Per-record processing (build) -------------------------------------------------------

type Processed = {
  record: SourceRecord;
  fetch: FetchResult;
  extractedText: string;
  title: string;
  canonicalUrl: string;
  canonicalOffDomain: boolean;
  wordCount: number;
  markdown: string;
  lastModified: string | undefined;
  effectiveDate: string | undefined;
  historicalWarning: string;
  isHistorical: boolean;
  isPdf: boolean;
  pdfBytes?: Uint8Array;
  earlyExclusion?: string;
  errorNote?: string;
  /** True when this doc came from a verified companion payload (no crawl). */
  isCompanion?: boolean;
  /** Companion/PDF status override, applied verbatim in finalize. */
  forcedStatus?: CurrentStatus;
  /** Real document version/edition when verified (never guessed). */
  documentVersion?: string;
};

async function fetchAndProcess(record: SourceRecord): Promise<Processed> {
  const base: Processed = {
    record,
    fetch: { ok: false, status: "error", finalUrl: record.url, contentType: "", lastModified: undefined },
    extractedText: "",
    title: record.expectedTitle,
    canonicalUrl: tryCanonicalizeUrl(record.url),
    canonicalOffDomain: false,
    wordCount: 0,
    markdown: "",
    lastModified: undefined,
    effectiveDate: undefined,
    historicalWarning: "",
    isHistorical: false,
    isPdf: record.sourceType !== "official-web-page" || isPdfUrl(record.url),
  };

  // Crawl-safety (approved domain / no auth / no trap / no asset).
  const safety = assessCrawlSafety(record.url);
  if (!safety.allowed) {
    return { ...base, earlyExclusion: `unsafe-url: ${safety.reason}` };
  }

  // Companion source: use verified inline content instead of crawling (JS-rendered / link-only
  // pages). The URL is already approved (schema) and safe (checked above); no network fetch.
  if (record.companion) {
    const body = record.companion.body.trim();
    const words = body.replace(/[#>*`\-|[\]()]/g, " ").split(/\s+/).filter(Boolean).length;
    return {
      ...base,
      isCompanion: true,
      isPdf: false,
      fetch: { ok: true, status: 200, finalUrl: record.url, contentType: "companion", lastModified: undefined },
      title: record.expectedTitle,
      extractedText: body,
      markdown: body,
      wordCount: words,
      effectiveDate: record.companion.effectiveDate,
      documentVersion: record.companion.documentVersion,
      forcedStatus: record.companion.currentStatus ?? "current",
    };
  }

  // robots.txt.
  let origin: string;
  let pathForRobots: string;
  try {
    const u = new URL(record.url);
    origin = u.origin;
    pathForRobots = `${u.pathname}${u.search}`;
  } catch {
    return { ...base, earlyExclusion: "unparseable-url" };
  }
  const robots = await getRobots(origin);
  if (!isPathAllowed(robots, pathForRobots)) {
    return { ...base, earlyExclusion: "robots-disallow" };
  }

  await sleep(REQUEST_DELAY_MS);
  const result = await politeFetch(record.url, { binary: base.isPdf });
  base.fetch = result;
  base.lastModified = result.lastModified;

  if (!result.ok) {
    return { ...base, errorNote: result.error };
  }

  // PDF path: preserve the file, do not extract/rewrite text.
  if (base.isPdf || result.contentType.includes("application/pdf")) {
    const bytes = result.bytes ?? new Uint8Array();
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    if (bytes.length < 1024 || !header.startsWith("%PDF")) {
      return { ...base, isPdf: true, earlyExclusion: "corrupt-or-empty-pdf" };
    }
    const historical = assessHistorical({
      url: result.finalUrl,
      title: record.expectedTitle,
      text: "",
      topic: record.topic,
      currentYear: CURRENT_YEAR,
    });
    return {
      ...base,
      isPdf: true,
      pdfBytes: bytes,
      title: record.expectedTitle,
      canonicalUrl: canonicalizeIfApproved(result.finalUrl, record.url),
      wordCount: 0,
      effectiveDate: normalizeHttpDate(result.lastModified),
      historicalWarning: `PDF preserved as-is — manually verify it is the CURRENT version and is text-based (not image-only). ${historical.reasons.join("; ")}`.trim(),
      isHistorical: historical.historical,
    };
  }

  // HTML path: extractive cleaning.
  const extracted = extractContent(result.body ?? "", result.finalUrl);
  const canonicalRaw = extracted.canonicalUrl ?? result.finalUrl;
  const canonicalOffDomain = Boolean(extracted.canonicalUrl) && !isApprovedOfficialUrl(extracted.canonicalUrl!);
  const historical = assessHistorical({
    url: result.finalUrl,
    title: extracted.title || record.expectedTitle,
    text: extracted.text,
    topic: record.topic,
    currentYear: CURRENT_YEAR,
  });

  return {
    ...base,
    isPdf: false,
    title: extracted.title || record.expectedTitle,
    extractedText: extracted.text,
    canonicalUrl: canonicalOffDomain ? tryCanonicalizeUrl(record.url) : canonicalizeIfApproved(canonicalRaw, record.url),
    canonicalOffDomain,
    wordCount: extracted.wordCount,
    markdown: extracted.markdown,
    lastModified: extracted.lastModified ?? result.lastModified,
    effectiveDate: normalizeIsoDate(extracted.lastModified) ?? normalizeHttpDate(result.lastModified),
    historicalWarning: historical.historical ? historical.reasons.join("; ") : "",
    isHistorical: historical.historical,
  };
}

function canonicalizeIfApproved(candidate: string, fallback: string): string {
  try {
    const c = canonicalizeUrl(candidate);
    return isApprovedOfficialUrl(c) ? c : tryCanonicalizeUrl(fallback);
  } catch {
    return tryCanonicalizeUrl(fallback);
  }
}

function normalizeHttpDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return undefined;
  return new Date(t).toISOString().slice(0, 10);
}

function normalizeIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const m = /\d{4}-\d{2}-\d{2}/.exec(value);
  return m ? m[0] : undefined;
}

// ---- Commands ----------------------------------------------------------------------------

async function cmdBuild(): Promise<void> {
  const records = loadManifestOrExit();
  const enabled = enabledRecords(records);
  console.log(
    `Building corpus from ${enabled.length} enabled source(s) of ${records.length} total. ` +
      `Polite delay ${REQUEST_DELAY_MS}ms; user agent "${USER_AGENT}".\n`,
  );

  // Clean the generated output tree so disabled/renamed sources never leave stale files behind
  // (the corpus must reflect only the current approved manifest). Only the generated tree is
  // removed; the manifest, reports, and everything else are untouched.
  if (existsSync(OUTPUT_DIR)) rmSync(OUTPUT_DIR, { recursive: true, force: true });
  ensureDir(OUTPUT_DIR);

  const processed: Processed[] = [];
  for (let i = 0; i < enabled.length; i += 1) {
    const record = enabled[i] as SourceRecord;
    process.stdout.write(`  [${i + 1}/${enabled.length}] ${record.url} ... `);
    try {
      const p = await fetchAndProcess(record);
      processed.push(p);
      if (p.earlyExclusion) console.log(`excluded (${p.earlyExclusion})`);
      else if (!p.fetch.ok) console.log(`fetch failed (${p.fetch.status}${p.errorNote ? `: ${p.errorNote}` : ""})`);
      else console.log(`ok (${p.isCompanion ? `companion, ${p.wordCount} words` : p.isPdf ? "pdf" : `${p.wordCount} words`})`);
    } catch (err) {
      console.log(`error (${err instanceof Error ? err.message : String(err)})`);
      processed.push({
        record,
        fetch: { ok: false, status: "error", finalUrl: record.url, contentType: "", lastModified: undefined },
        extractedText: "", title: record.expectedTitle, canonicalUrl: tryCanonicalizeUrl(record.url),
        canonicalOffDomain: false, wordCount: 0, markdown: "", lastModified: undefined, effectiveDate: undefined,
        historicalWarning: "", isHistorical: false, isPdf: false,
        errorNote: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Duplicate detection across successfully extracted HTML pages.
  const dedupInputs = processed
    .filter((p) => p.fetch.ok && !p.isPdf && !p.isCompanion && !p.earlyExclusion && p.extractedText)
    .map((p) => ({ id: p.record.url, text: p.extractedText }));
  const dedupVerdicts = new Map(detectDuplicates(dedupInputs).map((v) => [v.id, v]));

  // Finalize: write approved files, build review rows + produced manifest.
  const usedNames = new Set<string>();
  const rows: ReviewRow[] = [];
  const producedFiles: Array<Record<string, unknown>> = [];
  const rowCategory = new Map<string, string>();
  const rowExclusion = new Map<string, string>();

  ensureDir(OUTPUT_DIR);

  for (const p of processed) {
    const { record } = p;
    const dup = dedupVerdicts.get(record.url);
    const category = categoryForRecord({ topic: record.topic, department: record.department, sourceType: record.sourceType });

    let approved = false;
    let exclusionReason = "";
    let currentStatus: CurrentStatus = p.isHistorical ? "historical" : "current";
    let outputFile = "";

    if (p.earlyExclusion) {
      exclusionReason = p.earlyExclusion;
    } else if (!p.fetch.ok) {
      exclusionReason = `http-error (${p.fetch.status})`;
    } else if (p.isCompanion) {
      // Verified companion content is curated; approve with its declared status.
      approved = true;
      currentStatus = p.forcedStatus ?? "current";
    } else if (p.isPdf) {
      // PDFs: preserve unless corrupt (handled) or archived/historical.
      if (p.isHistorical) {
        exclusionReason = "historical-or-stale";
        currentStatus = "historical";
      } else {
        approved = true;
        currentStatus = "review-needed"; // must be manually confirmed current
      }
    } else {
      const assessment = assessPage({
        httpOk: p.fetch.ok,
        title: p.title,
        wordCount: p.wordCount,
        historical: { historical: p.isHistorical, reasons: p.historicalWarning ? [p.historicalWarning] : [] },
        duplicate: dup ? { isDuplicate: dup.isDuplicate, duplicateOf: dup.duplicateOf } : undefined,
        canonicalOffDomain: p.canonicalOffDomain,
      });
      approved = assessment.approved;
      currentStatus = assessment.currentStatus;
      exclusionReason = assessment.exclusionReason ?? "";
    }

    let validationErrors = "";
    if (approved) {
      try {
        const baseName = uniqueName(`${category}/${baseNameFromUrl(record.url)}`, usedNames);
        const ext = p.isPdf ? "pdf" : "md";
        const contentFile = `${baseName}.${ext}`;
        const absContent = join(OUTPUT_DIR, contentFile);
        ensureDir(dirname(absContent));

        if (p.isPdf) {
          writeFileSync(absContent, Buffer.from(p.pdfBytes ?? new Uint8Array()));
        } else {
          const doc = buildMarkdownDocument({
            title: p.title,
            sourceUrl: record.url,
            department: record.department,
            lastChecked: TODAY,
            canonicalUrl: p.canonicalUrl,
            topic: record.topic,
            effectiveDate: p.effectiveDate,
            historicalWarning: p.historicalWarning || undefined,
            content: p.markdown,
          });
          writeFileSync(absContent, doc);
        }

        const sidecar = buildMetadataSidecar({
          sourceUrl: record.url,
          pageTitle: p.title,
          department: record.department,
          topic: record.topic,
          sourceType: record.sourceType,
          canonicalUrl: p.canonicalUrl,
          lastChecked: TODAY,
          currentStatus,
          effectiveDate: p.effectiveDate,
          documentVersion: p.documentVersion,
          keywords: record.keywords,
        });
        // Validate before writing so a bad sidecar never reaches disk / upload.
        const check = metadataSidecarSchema.safeParse(sidecar);
        if (!check.success) throw new Error(check.error.issues.map((i) => i.message).join("; "));
        writeFileSync(join(OUTPUT_DIR, metadataFileName(contentFile)), `${JSON.stringify(sidecar, null, 2)}\n`);

        outputFile = contentFile;
        rowCategory.set(record.url, category);
        producedFiles.push({
          file: contentFile,
          metadataFile: metadataFileName(contentFile),
          category,
          sourceUrl: record.url,
          canonicalUrl: p.canonicalUrl,
          title: p.title,
          department: record.department,
          topic: record.topic,
          sourceType: record.sourceType,
          currentStatus,
          wordCount: p.isPdf ? null : p.wordCount,
          effectiveDate: p.effectiveDate ?? null,
        });
      } catch (err) {
        approved = false;
        validationErrors = err instanceof Error ? err.message : String(err);
        exclusionReason = "write-or-validation-error";
      }
    }

    if (!approved && exclusionReason) rowExclusion.set(record.url, exclusionReason);

    const duplicateStatus = dup?.isDuplicate
      ? `${dup.kind}-duplicate of ${dup.duplicateOf} (${dup.similarity.toFixed(2)})`
      : "unique";

    rows.push({
      sourceUrl: record.url,
      outputFile,
      title: p.title,
      department: record.department,
      topic: record.topic,
      sourceType: record.sourceType,
      httpStatus: p.fetch.status,
      canonicalUrl: p.canonicalUrl,
      wordCount: p.isPdf ? "" : p.wordCount,
      duplicateStatus,
      historicalWarning: p.historicalWarning,
      lastModified: p.lastModified ?? "",
      approvedForUpload: approved,
      validationErrors,
    });
  }

  // Produced manifest.
  const producedManifest = {
    name: "Lemoore College Bedrock corpus",
    description:
      "Cleaned, citation-ready official-source documents + Bedrock metadata sidecars produced by the ingestion pipeline. Prototype demo — not the official website.",
    generatedAt: NOW_ISO,
    prefix: process.env.BEDROCK_SOURCE_PREFIX ?? "lemoore/",
    approvedDomains: ["lemoorecollege.edu", "westhillscollege.com", "whccd.edu"],
    documentCount: producedFiles.length,
    files: producedFiles,
  };
  writeJson(join(OUTPUT_DIR, "manifest.json"), producedManifest);

  // Review artifacts.
  ensureDir(REPORTS_DIR);
  writeFileSync(join(REPORTS_DIR, "lemoore-ingestion-review.csv"), toCsv(rows));
  const summary = buildSummary(rows, {
    generatedAt: NOW_ISO,
    categoryOf: (row) => rowCategory.get(row.sourceUrl) ?? "unknown",
    exclusionReasonOf: (row) => rowExclusion.get(row.sourceUrl),
  });
  writeJson(join(REPORTS_DIR, "lemoore-ingestion-summary.json"), summary);

  console.log(
    `\nBuild complete: ${summary.totals.approvedForUpload} approved ` +
      `(${summary.totals.cleanedHtml} HTML, ${summary.totals.preservedPdf} PDF), ` +
      `${summary.totals.excluded} excluded, ${summary.totals.duplicates} duplicate(s), ` +
      `${summary.totals.historicalWarnings} historical/stale warning(s).`,
  );
  console.log(`Output: ${relative(ROOT, OUTPUT_DIR)}`);
  console.log(`Reports: ${relative(ROOT, REPORTS_DIR)}/lemoore-ingestion-review.csv, lemoore-ingestion-summary.json`);
  console.log("\nNo files were uploaded. Review the report, then run `npm run sources:upload` (dry-run by default).");
}

// Walk produced output for .md/.pdf files (excluding manifest + sidecars).
function listContentFiles(): string[] {
  if (!existsSync(OUTPUT_DIR)) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) walk(abs);
      else if ((entry.endsWith(".md") || entry.endsWith(".pdf")) && !entry.endsWith(".metadata.json")) out.push(abs);
    }
  };
  walk(OUTPUT_DIR);
  return out.sort();
}

function cmdValidate(): void {
  // 1) Manifest validity.
  const records = loadManifestOrExit();
  console.log(`Manifest OK: ${records.length} record(s), ${enabledRecords(records).length} enabled.`);

  if (!existsSync(OUTPUT_DIR)) {
    console.error(`No built corpus at ${relative(ROOT, OUTPUT_DIR)}. Run \`npm run sources:build\` first.`);
    process.exit(1);
  }

  const files = listContentFiles();
  let errors = 0;
  const hashes = new Map<string, string>();

  for (const abs of files) {
    const rel = relative(OUTPUT_DIR, abs).replace(/\\/g, "/");
    const problems: string[] = [];
    const sidecarPath = `${abs}.metadata.json`;

    // 2) Metadata sidecar present + schema-valid.
    if (!existsSync(sidecarPath)) {
      problems.push("missing metadata sidecar");
    } else {
      const parsed = metadataSidecarSchema.safeParse(readJson(sidecarPath));
      if (!parsed.success) {
        problems.push(`metadata invalid: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
      } else {
        const attrs = parsed.data.metadataAttributes;
        // 3) Source URL preserved + approved.
        if (!isApprovedOfficialUrl(attrs.source_url.value.stringValue)) {
          problems.push("source_url not an approved official URL");
        }
        // 4) No stale doc silently marked current.
        if (abs.endsWith(".md")) {
          const body = readFileSync(abs, "utf8");
          if (/Historical\/stale content notice/i.test(body) && attrs.current_status.value.stringValue === "current") {
            problems.push("stale content marked current");
          }
          // 5) Visible source header present + source URL matches metadata.
          if (!/^#\s+\S/.test(body)) problems.push("missing H1 title");
          if (!body.includes(`Source URL: ${attrs.source_url.value.stringValue}`)) {
            problems.push("source header missing/does not match metadata source_url");
          }
        }
      }
    }

    // 6) Duplicate detection across produced docs (exact-hash) for .md files.
    if (abs.endsWith(".md")) {
      const text = readFileSync(abs, "utf8").replace(/[#>*`\-|[\]()]/g, " ");
      const dv = detectDuplicates([...hashes.entries()].map(([id, t]) => ({ id, text: t })).concat({ id: rel, text }));
      const mine = dv.find((v) => v.id === rel);
      if (mine?.kind === "exact") problems.push(`exact duplicate of ${mine.duplicateOf}`);
      hashes.set(rel, text);
    }

    if (problems.length) {
      errors += 1;
      console.error(`  ✗ ${rel}: ${problems.join("; ")}`);
    } else {
      console.log(`  ✓ ${rel}`);
    }
  }

  console.log(`\n${files.length} document(s), ${errors} error(s). No AWS calls performed.`);
  if (errors) process.exit(1);
}

function cmdReview(): void {
  const producedPath = join(OUTPUT_DIR, "manifest.json");
  const summaryPath = join(REPORTS_DIR, "lemoore-ingestion-summary.json");
  if (!existsSync(producedPath)) {
    console.error(`No built corpus manifest. Run \`npm run sources:build\` first.`);
    process.exit(1);
  }
  const produced = readJson(producedPath) as { documentCount: number; files: Array<Record<string, unknown>> };
  const summary = existsSync(summaryPath) ? (readJson(summaryPath) as Record<string, unknown>) : undefined;

  // Build a concise, human-readable Markdown review report from the produced corpus.
  const byCategory = new Map<string, Array<Record<string, unknown>>>();
  for (const f of produced.files) {
    const cat = String(f.category ?? "unknown");
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(f);
  }

  const lines: string[] = [
    "# Lemoore College ingestion review",
    "",
    `Generated: ${NOW_ISO}`,
    `Documents ready for review: ${produced.documentCount}`,
    "",
    "> Prototype demo — not the official Lemoore College website. Review before any upload.",
    "",
    "## Documents by category",
    "",
  ];
  for (const [cat, files] of [...byCategory.entries()].sort()) {
    lines.push(`### ${cat} (${files.length})`);
    for (const f of files) {
      lines.push(
        `- **${f.title}** — [${f.sourceUrl}](${f.sourceUrl}) — status: ${f.currentStatus}` +
          (f.effectiveDate ? ` — effective ${f.effectiveDate}` : ""),
      );
    }
    lines.push("");
  }
  if (summary) {
    lines.push("## Summary", "", "```json", JSON.stringify(summary, null, 2), "```", "");
  }

  ensureDir(REPORTS_DIR);
  const outPath = join(REPORTS_DIR, "lemoore-ingestion-review.md");
  writeFileSync(outPath, `${lines.join("\n")}\n`);

  console.log(lines.join("\n"));
  console.log(`\nReview report written: ${relative(ROOT, outPath)}`);
  console.log(`CSV: ${relative(ROOT, join(REPORTS_DIR, "lemoore-ingestion-review.csv"))}`);
  console.log("No AWS calls performed.");
}

async function cmdDiscover(argv: string[]): Promise<void> {
  const records = loadManifestOrExit();
  const existing = records.map((r) => tryCanonicalizeUrl(r.url));
  const seedMode = argv.includes("--seeds");

  const seen = new Set<string>();
  const candidates: Array<Record<string, unknown>> = [];
  const origin = "https://lemoorecollege.edu";

  // 1) Sitemap.
  const robots = await getRobots(origin);
  const sitemapUrls = robots.sitemaps.length ? robots.sitemaps : [`${origin}/sitemap.xml`];
  const sitemapEntries: Array<{ loc: string; lastmod?: string }> = [];
  for (const sm of sitemapUrls) {
    await sleep(REQUEST_DELAY_MS);
    const res = await politeFetch(sm);
    if (res.ok && res.body) sitemapEntries.push(...parseSitemap(res.body));
  }
  console.log(`Sitemap(s) yielded ${sitemapEntries.length} URL(s).`);

  // 2) Optional: links from approved enabled seed pages.
  if (seedMode) {
    for (const record of enabledRecords(records)) {
      await sleep(REQUEST_DELAY_MS);
      const res = await politeFetch(record.url);
      if (res.ok && res.body) {
        for (const link of extractLinks(res.body, res.finalUrl)) {
          sitemapEntries.push({ loc: link });
        }
      }
    }
  }

  for (const entry of sitemapEntries) {
    let canonical: string;
    try {
      canonical = canonicalizeUrl(entry.loc);
    } catch {
      continue;
    }
    if (seen.has(canonical)) continue;
    seen.add(canonical);

    const pathAllowed = (() => {
      try {
        const u = new URL(entry.loc);
        return isPathAllowed(robots, `${u.pathname}${u.search}`);
      } catch {
        return false;
      }
    })();

    const candidate = classifyCandidate({
      url: entry.loc,
      referrer: seedMode ? "approved seed page / sitemap" : "sitemap",
      detectedTitle: undefined,
      lastmod: entry.lastmod,
      existingCanonicalUrls: existing,
      currentYear: CURRENT_YEAR,
    });

    const alreadyInManifest = existing.some((u) => isSameCanonicalUrl(u, entry.loc));
    candidates.push({
      ...candidate,
      lastmod: entry.lastmod ?? null,
      robotsAllowed: pathAllowed,
      alreadyInManifest,
      recommendation: !pathAllowed ? "exclude" : candidate.recommendation,
      recommendationReason: !pathAllowed ? "robots.txt disallow" : candidate.recommendationReason,
    });
  }

  const newIncludes = candidates.filter((c) => c.recommendation === "include" && !c.alreadyInManifest);
  const report = {
    generatedAt: NOW_ISO,
    origin,
    seedMode,
    totalCandidates: candidates.length,
    alreadyInManifest: candidates.filter((c) => c.alreadyInManifest).length,
    recommendedNewIncludes: newIncludes.length,
    note:
      "Discovery is advisory only. No candidate is added to the manifest or uploaded. A human must review and add/enable entries in data/ingestion/lemoore-sources.json.",
    candidates,
  };
  ensureDir(REPORTS_DIR);
  writeJson(join(REPORTS_DIR, "lemoore-discovered-urls.json"), report);

  console.log(
    `Discovered ${candidates.length} candidate(s); ${report.alreadyInManifest} already in manifest; ` +
      `${newIncludes.length} recommended new include(s).`,
  );
  console.log(`Report: ${relative(ROOT, join(REPORTS_DIR, "lemoore-discovered-urls.json"))}`);
  console.log("Nothing was added to the manifest. Review and enable entries manually.");
}

function uploadTargets(): Array<{ abs: string; key: string }> {
  const prefix = (process.env.BEDROCK_SOURCE_PREFIX ?? "lemoore/").replace(/^\/+/, "");
  const normalizedPrefix = prefix.endsWith("/") || prefix === "" ? prefix : `${prefix}/`;
  const targets: Array<{ abs: string; key: string }> = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) walk(abs);
      else {
        const relKey = relative(OUTPUT_DIR, abs).replace(/\\/g, "/");
        if (relKey === "manifest.json") continue; // corpus manifest is local metadata, not a KB doc
        targets.push({ abs, key: `${normalizedPrefix}${relKey}` });
      }
    }
  };
  walk(OUTPUT_DIR);
  return targets.sort((a, b) => a.key.localeCompare(b.key));
}

async function cmdUpload(argv: string[]): Promise<void> {
  const config = {
    region: process.env.AWS_REGION,
    bucket: process.env.BEDROCK_SOURCE_BUCKET,
    prefix: process.env.BEDROCK_SOURCE_PREFIX ?? "lemoore/",
  };
  const decision = resolveUploadDecision({ confirmed: isConfirmed(argv), config });
  const targets = uploadTargets();

  if (targets.length === 0) {
    console.error("No files to upload. Run `npm run sources:build` and review first.");
    process.exit(1);
  }

  if (decision.action === "abort") {
    console.error(`Upload aborted: ${decision.reason}`);
    console.error("Set the required environment variables (see .env.example) and retry with --confirm.");
    process.exit(1);
  }

  const destination = config.bucket ? `s3://${config.bucket}/${(config.prefix ?? "").replace(/^\/+/, "")}` : "s3://<BEDROCK_SOURCE_BUCKET>/<BEDROCK_SOURCE_PREFIX>";

  if (decision.action === "dry-run") {
    console.log(`DRY RUN — ${decision.reason}.`);
    console.log(`Would upload ${targets.length} object(s) to ${destination}:`);
    for (const t of targets.slice(0, 200)) console.log(`  ${t.key}`);
    console.log("\nNo AWS calls were made. Re-run with --confirm and valid config to upload for real.");
    return;
  }

  // EXECUTE: real S3 upload to the EXISTING bucket/prefix. Never creates/deletes buckets.
  console.log(`Uploading ${targets.length} object(s) to ${destination} ...`);
  const s3 = await importS3OrExit();
  const client = new s3.S3Client({ region: config.region });
  let done = 0;
  for (const t of targets) {
    const isJson = t.key.endsWith(".json");
    const isPdf = t.key.endsWith(".pdf");
    const body = readFileSync(t.abs);
    await client.send(
      new s3.PutObjectCommand({
        Bucket: config.bucket,
        Key: t.key,
        Body: body,
        ContentType: isPdf ? "application/pdf" : isJson ? "application/json" : "text/markdown; charset=utf-8",
      }),
    );
    done += 1;
    if (done % 10 === 0 || done === targets.length) console.log(`  uploaded ${done}/${targets.length}`);
  }
  console.log(`Upload complete: ${done} object(s). Next: run \`npm run sources:sync\` to ingest.`);
}

async function cmdSync(argv: string[]): Promise<void> {
  const config = {
    region: process.env.AWS_REGION,
    knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID,
    dataSourceId: process.env.BEDROCK_DATA_SOURCE_ID,
  };
  const decision = resolveSyncDecision({ confirmed: isConfirmed(argv), config });

  if (decision.action === "abort") {
    console.error(`Sync aborted: ${decision.reason}`);
    console.error("Set the required environment variables (see .env.example) and retry with --confirm.");
    process.exit(1);
  }

  if (decision.action === "dry-run") {
    console.log(`DRY RUN — ${decision.reason}.`);
    console.log(
      "Would start ONE ingestion job for the EXISTING Knowledge Base data source:\n" +
        `  knowledgeBaseId: ${config.knowledgeBaseId ?? "<BEDROCK_KNOWLEDGE_BASE_ID>"}\n` +
        `  dataSourceId:    ${config.dataSourceId ?? "<BEDROCK_DATA_SOURCE_ID>"}\n` +
        `  region:          ${config.region ?? "<AWS_REGION>"}`,
    );
    console.log("\nThe Knowledge Base / data source are NEVER created, replaced, or deleted. No AWS calls were made.");
    return;
  }

  // EXECUTE: start a single ingestion job on the existing data source.
  const agent = await importBedrockAgentOrExit();
  const client = new agent.BedrockAgentClient({ region: config.region });
  console.log("Starting ingestion job ...");
  const res = await client.send(
    new agent.StartIngestionJobCommand({
      knowledgeBaseId: config.knowledgeBaseId,
      dataSourceId: config.dataSourceId,
      description: "Lemoore Student Success Assistant corpus sync (ingestion pipeline).",
    }),
  );
  const jobId = res.ingestionJob?.ingestionJobId ?? "(unknown)";
  const status = res.ingestionJob?.status ?? "(unknown)";
  console.log(`Ingestion job started: id=${jobId}, status=${status}.`);
  console.log("Monitor completion in the Bedrock console, then run `npm run sources:evaluate`.");
}

async function cmdEvaluate(): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    console.error("Refusing to run sources:evaluate under NODE_ENV=test.");
    process.exit(1);
  }
  const evalSet = readJson(EVAL_PATH) as {
    questions: Array<{ id: string; question: string; expectedTopic: string; expectedSourceUrls: string[] }>;
  };
  const region = process.env.AWS_REGION;
  const knowledgeBaseId = process.env.BEDROCK_KNOWLEDGE_BASE_ID;
  const numberOfResults = clampInt(process.env.BEDROCK_NUMBER_OF_RESULTS, 1, 20, 8);

  console.log(`Retrieval evaluation set: ${evalSet.questions.length} question(s).`);
  if (!region || !knowledgeBaseId) {
    console.log(
      "\nAWS_REGION and BEDROCK_KNOWLEDGE_BASE_ID are not set — cannot run live retrieval.\n" +
        "This command retrieves (read-only, live/paid) against the synchronized Knowledge Base.\n" +
        "Set the values in .env.local and retry. Printing the evaluation plan only:\n",
    );
    for (const q of evalSet.questions) {
      console.log(`  ${q.id} [${q.expectedTopic}] ${q.question}`);
    }
    return;
  }

  console.warn("\n⚠️  sources:evaluate performs LIVE, PAID Bedrock Retrieve calls. Retrieval only — no answer generation.\n");
  const runtime = await import("@aws-sdk/client-bedrock-agent-runtime");
  const client = new runtime.BedrockAgentRuntimeClient({ region });

  const results: Array<Record<string, unknown>> = [];
  let usableCount = 0;

  for (const q of evalSet.questions) {
    let line: Record<string, unknown>;
    try {
      const res = await client.send(
        new runtime.RetrieveCommand({
          knowledgeBaseId,
          retrievalQuery: { text: q.question },
          retrievalConfiguration: { vectorSearchConfiguration: { numberOfResults } },
        }),
      );
      const retrieved = (res.retrievalResults ?? []).map((r, idx) => {
        const md = (r.metadata ?? {}) as Record<string, unknown>;
        const url = pickApprovedUrl(md, r.location);
        return {
          rank: idx + 1,
          title: String(md["page_title"] ?? md["title"] ?? "(untitled)"),
          url,
          currentStatus: String(md["current_status"] ?? ""),
          wrongCampus: url ? !isApprovedOfficialUrl(url) : false,
          historicalSource: String(md["current_status"] ?? "") === "historical",
        };
      });
      const expectedCanon = q.expectedSourceUrls.map((u) => tryCanonicalizeUrl(u));
      const rank = retrieved.findIndex((r) => r.url && expectedCanon.some((e) => isSameCanonicalUrl(e, r.url!)));
      const usable = rank !== -1;
      if (usable) usableCount += 1;
      line = {
        id: q.id,
        question: q.question,
        expectedTopic: q.expectedTopic,
        expectedSourceUrls: q.expectedSourceUrls,
        retrievedTitles: retrieved.map((r) => r.title),
        retrievedUrls: retrieved.map((r) => r.url).filter(Boolean),
        expectedRank: usable ? rank + 1 : null,
        usable,
        wrongCampusWarning: retrieved.some((r) => r.wrongCampus),
        historicalSourceWarning: retrieved.some((r) => r.historicalSource),
      };
      console.log(`  ${q.id}: ${usable ? `usable (rank ${rank + 1})` : "NOT usable"} — ${retrieved.length} result(s)`);
    } catch (err) {
      line = { id: q.id, question: q.question, error: err instanceof Error ? err.name : "unknown", usable: false };
      console.log(`  ${q.id}: error (${err instanceof Error ? err.name : "unknown"})`);
    }
    results.push(line);
  }

  ensureDir(REPORTS_DIR);
  writeJson(join(REPORTS_DIR, "lemoore-eval-results.json"), {
    generatedAt: NOW_ISO,
    knowledgeBaseId: "<redacted>",
    total: evalSet.questions.length,
    usable: usableCount,
    results,
  });
  console.log(`\nRetrieval usable for ${usableCount}/${evalSet.questions.length} question(s).`);
  console.log(`Report: ${relative(ROOT, join(REPORTS_DIR, "lemoore-eval-results.json"))} (KB id redacted).`);
}

// Recognized URL fields, matching the app's citation contract (INTEGRATIONS.md priority order).
function pickApprovedUrl(md: Record<string, unknown>, location: unknown): string | undefined {
  const candidates = [
    md["canonical_url"], md["canonicalUrl"], md["source_url"], md["sourceUrl"],
    md["url"], md["page_url"], md["pageUrl"],
  ];
  for (const c of candidates) {
    if (typeof c === "string" && isApprovedOfficialUrl(c)) return c;
  }
  const web = (location as { webLocation?: { url?: string } } | undefined)?.webLocation?.url;
  if (typeof web === "string" && isApprovedOfficialUrl(web)) return web;
  return undefined;
}

async function importS3OrExit(): Promise<typeof import("@aws-sdk/client-s3")> {
  try {
    return await import("@aws-sdk/client-s3");
  } catch {
    console.error(
      "The AWS SDK S3 client is not installed. Install it to perform a real upload:\n" +
        "  npm install @aws-sdk/client-s3",
    );
    process.exit(1);
  }
}

async function importBedrockAgentOrExit(): Promise<typeof import("@aws-sdk/client-bedrock-agent")> {
  try {
    return await import("@aws-sdk/client-bedrock-agent");
  } catch {
    console.error(
      "The AWS SDK Bedrock Agent client is not installed. Install it to start a real ingestion job:\n" +
        "  npm install @aws-sdk/client-bedrock-agent",
    );
    process.exit(1);
  }
}

// ---- Entry point -------------------------------------------------------------------------

async function main(): Promise<void> {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const [, , command, ...rest] = process.argv;
  switch (command) {
    case "discover":
      await cmdDiscover(rest);
      break;
    case "build":
      await cmdBuild();
      break;
    case "validate":
      cmdValidate();
      break;
    case "review":
      cmdReview();
      break;
    case "upload":
      await cmdUpload(rest);
      break;
    case "sync":
      await cmdSync(rest);
      break;
    case "evaluate":
      await cmdEvaluate();
      break;
    default:
      console.error(
        `Unknown command "${command ?? ""}". Use one of: discover | build | validate | review | upload | sync | evaluate`,
      );
      process.exit(1);
  }
}

await main();
