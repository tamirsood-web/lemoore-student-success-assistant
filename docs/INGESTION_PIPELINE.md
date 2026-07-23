# Content Ingestion Pipeline (Bedrock corpus)

A repeatable, review-gated pipeline that turns a curated list of **official** Lemoore College /
West Hills CCD URLs into a clean, citation-ready corpus for the existing Amazon Bedrock
Knowledge Base. It downloads, cleans, de-duplicates, separates current from historical content,
writes Bedrock metadata sidecars, produces a human-review report, and — only on explicit
confirmation — uploads to the existing S3 data source and starts an ingestion job.

> Prototype demo — not the official Lemoore College website. The pipeline never fabricates
> content or metadata, never weakens grounding/citation rules, and never creates or deletes any
> AWS resource.

## Where things live

| Path | Purpose |
| --- | --- |
| `data/ingestion/lemoore-sources.json` | **Reviewed manifest** of official URLs (the only pages the pipeline may download). |
| `data/ingestion/eval-questions.json` | 45 realistic retrieval-evaluation questions with expected sources. |
| `src/lib/ingestion/**` | Pure, unit-tested library: canonicalization, approved-domain + crawl safety, robots, extraction, dedup, historical detection, metadata, manifest, report, execution gate, discovery. |
| `scripts/sources.mts` | CLI orchestrator (network + filesystem + AWS live only here). |
| `data/bedrock/lemoore/**` | **Generated** cleaned corpus: `<category>/<page>.md` + `<page>.md.metadata.json`, preserved PDFs, and `manifest.json`. |
| `reports/**` | `lemoore-discovered-urls.json`, `lemoore-ingestion-review.csv`, `lemoore-ingestion-summary.json`, `lemoore-ingestion-review.md`, `lemoore-eval-results.json`. |

The generated corpus under `data/bedrock/lemoore/` is a **separate** tree from the existing
local-mode corpus (`data/lemoore/`). The website search, chatbot UI, API contracts, and the live
Bedrock query integration are unchanged.

## Commands

```bash
npm run sources:discover    # inspect sitemap/links → candidate report (no manifest change, no upload)
npm run sources:build       # download + clean ENABLED manifest entries → local output only
npm run sources:validate    # validate produced files, metadata schema, rules (no AWS)
npm run sources:review      # (re)generate the human review report (no AWS)
npm run sources:upload      # upload approved files to the EXISTING S3 prefix (DRY-RUN by default)
npm run sources:sync        # start ONE ingestion job for the EXISTING KB data source (DRY-RUN by default)
npm run sources:evaluate    # retrieve (read-only) against the KB and print privacy-safe results
```

`discover` and `build` are the only commands that fetch from the web. `validate` and `review`
touch no network and no AWS. `upload` and `sync` **default to dry-run** and require an explicit
`--confirm` flag plus complete configuration before any AWS write:

```bash
npm run sources:upload -- --confirm    # real upload (requires AWS_REGION + BEDROCK_SOURCE_BUCKET + BEDROCK_SOURCE_PREFIX)
npm run sources:sync   -- --confirm    # real ingestion job (requires AWS_REGION + BEDROCK_KNOWLEDGE_BASE_ID + BEDROCK_DATA_SOURCE_ID)
```

## Crawl authorization & safety

- **Approved domains only** — reuses the app's `APPROVED_OFFICIAL_DOMAINS` (`lemoorecollege.edu`,
  `westhillscollege.com`, `whccd.edu`, and subdomains); HTTPS required. The manifest cannot widen
  this.
- **robots.txt respected** per host (Lemoore disallows `/academics/`, `/_zArchive/`, and
  `*/documents/archived/*.pdf`, all honored).
- **Never crawled**: authenticated portals (myWestHills, Canvas, `my.`/`login.`/`portal.` hosts),
  login/account/grades paths, form endpoints, search/calendar/pagination parameter loops, and
  non-text assets.
- **Descriptive user agent**, a configurable **per-host delay** (`INGEST_REQUEST_DELAY_MS`,
  default 800 ms, minimum 500 ms), bounded concurrency (sequential per host), and retry/back-off
  on 429/503.

## Cleaning & metadata

- **Extractive only** — headings, lists, tables, meaningful link text, and body prose are copied
  from the source; navigation, header, footer, asides, cookie banners, scripts/styles, and
  screen-reader-only duplicates are removed. **No AI model rewrites content.**
- Every Markdown file starts with a visible **source header** (title, Source URL, Department,
  Last checked) so the content is traceable.
- Each file has a Bedrock **`.metadata.json`** sidecar with typed `metadataAttributes`:
  `page_title`, `department`, `topic` are `includeForEmbedding: true`; `source_url`,
  `canonical_url`, `source_type`, `last_checked`, `effective_date`, `document_version` are
  `includeForEmbedding: false`. `source_url`/`canonical_url` must be approved official HTTPS URLs,
  matching the app's citation contract (`docs/INTEGRATIONS.md`).
- **Keywords (synonym coverage):** a manifest record may declare `keywords: [...]`, written to
  the sidecar as an embedded `STRING_LIST` so alternate wording (e.g. "tuition"/"fees"/"payment"
  on the Cost of Attendance page) still retrieves the canonical source without duplicating
  content.
- **Companion sources:** a record may declare a `companion` payload with verified inline `body`
  (plus optional `effectiveDate`/`documentVersion`/`currentStatus`). The build uses it INSTEAD of
  crawling — for pages whose real content is JavaScript-rendered (crawler sees an empty shell) or
  whose useful information is an official link/PDF plus a few verified facts (catalog pointer,
  contact card, campus-map + PDF, payment/refund contact + process). The body must contain only
  facts and official links verified from the official page source — never an AI summary, never
  invented data. The canonical citation URL always stays on an approved on-domain page; official
  but off-domain links (e.g. an external net-price calculator or a Formstack refund form) are
  referenced by name, never used as a citation URL.
- **Duplicates** (exact hash + near-duplicate shingle/Jaccard) and **historical/stale** pages
  (archived paths, old catalog/calendar years, archived-language) are flagged; a stale page is
  never marked `current` and is excluded by default. PDFs are preserved as-is and marked
  `review-needed` pending manual currency verification.

## Environment variables (script-only, server-only)

Add these to `.env.local` (gitignored) or the deployment environment. They are **not**
`NEXT_PUBLIC_*` and are read only by `scripts/sources.mts`.

```bash
AWS_REGION=                       # region of the EXISTING bucket + Knowledge Base
BEDROCK_SOURCE_BUCKET=            # EXISTING S3 bucket used by the KB data source (never created here)
BEDROCK_SOURCE_PREFIX=lemoore/    # key prefix under that bucket
BEDROCK_DATA_SOURCE_ID=           # EXISTING Bedrock data source id
BEDROCK_KNOWLEDGE_BASE_ID=        # EXISTING KB id (also used by the live query integration)

# Optional pipeline tuning:
INGEST_REQUEST_DELAY_MS=800       # polite per-host delay (>= 500)
INGEST_CURRENT_YEAR=2026          # academic reference year for staleness detection
BEDROCK_NUMBER_OF_RESULTS=8       # retrieval results per query in sources:evaluate
```

> `.env.example` in this repo is protected in the current tooling sandbox and was not modified by
> the pipeline change; add the placeholders above to it manually.

The real S3-upload and sync execution paths use `@aws-sdk/client-s3` and
`@aws-sdk/client-bedrock-agent` (declared as `optionalDependencies`). They are dynamically
imported **only** on a confirmed real run; if missing, the command prints the exact
`npm install` line. Dry-runs, tests, and the app build never import them. Credentials come from
the standard AWS default provider chain — never hard-coded.

## Adding a new page

1. `npm run sources:discover` → review `reports/lemoore-discovered-urls.json`.
2. Add/enable the URL in `data/ingestion/lemoore-sources.json` (a human step — discovery never
   edits the manifest).
3. `npm run sources:build && npm run sources:validate && npm run sources:review`.
4. Only after the review is approved: `npm run sources:upload -- --confirm` then
   `npm run sources:sync -- --confirm`, then `npm run sources:evaluate`.
