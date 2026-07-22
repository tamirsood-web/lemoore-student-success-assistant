# AI Website Search & Grounded Assistant

This document describes the AI website search and the floating Student Assistant added to
the reproduced Lemoore College homepage, and how their grounded-answer pipeline works.

> **Prototype demo — not the official Lemoore College website.** All answers are drawn only
> from official pages ingested into the local corpus and link back to the real source.

## What was added

Three improvements over the current public site, on top of a faithful static reproduction
of the homepage shell (header, hero, sections, footer):

1. **AI website search** — a header/hero search control that opens an overlay accepting
   keywords or natural-language questions and returns a direct, cited answer.
2. **Floating Student Assistant** — a bottom-right chat widget using the same pipeline.
3. **Official-source citations** — every answer links to the real Lemoore College page it
   came from, with a verbatim supporting excerpt.

## The corpus (`data/lemoore/`)

- `data/lemoore/pages/*.json` — one record per official page, ingested from approved
  domains (`lemoorecollege.edu`, `westhillscollege.com`, `whccd.edu`).
- `data/lemoore/manifest.json` — generated index of the corpus.
- Each record: `id`, `title`, `url` (canonical HTTPS), `department`, `topic`,
  `sourceType: "official-web-page"`, `lastIngested`, `content`, and `chunks[]`.
- Loaded + **validated** at module load in `src/lib/knowledge/corpus.ts`
  (`officialSourceSchema`): a malformed, off-domain, or non-HTTPS record fails fast.

Current corpus: **16 official pages, 59 chunks.**

### Refresh / re-ingest

```bash
npm run corpus:validate   # verify all pages are HTTPS, on-domain, non-empty (CI-safe)
npm run corpus:manifest   # regenerate manifest.json from the page files
npm run corpus:refresh    # re-fetch approved pages (rate-limited; manual review before commit)
```

The ingestion script (`scripts/ingest.mjs`) restricts crawling to approved domains, applies
a polite delay, avoids auth-protected/student-specific pages, preserves canonical URLs, and
never fabricates content — a failed fetch is reported as `NEEDS INGESTION`.

## The shared pipeline (`src/lib/rag/`)

Website search and the assistant call **one** service over **one** corpus:

```
query
  → QueryRewriter        normalize + tokenize + synonym expansion   (queryRewriter.ts)
  → privacy screen       block SHARED identifiers (SSN/card/etc.)   (privacy.ts)
  → KnowledgeRetriever   lexical scoring of official chunks         (retriever.ts)
  → ResultReranker       collapse chunks → ranked pages             (reranker.ts)
  → sufficiency check    strong / weak / none                       (searchAnswerService.ts)
  → GroundedAnswer       extractive answer from top page            (answerGenerator.ts)
  → CitationMapper       ranked pages → OfficialSourceCitation[]    (citationMapper.ts)
  → WebsiteSearchResponse
```

- **Grounding:** in local mode the answer text is the verbatim supporting excerpt of the
  top page plus an inline `[1]` marker — it cannot contain anything absent from the corpus.
- **Honest non-answers:** weak evidence → `clarification` (with suggested questions); no
  evidence → `unsupported`; shared PII → `unsupported` with a privacy message (never echoed).

### Response contract (`src/types/search.ts`, validated by Zod)

```ts
type WebsiteSearchResponse =
  | { kind: "answered"; query; answer; citations: [>=1]; relatedResults }
  | { kind: "clarification"; query; message; suggestedQuestions }
  | { kind: "unsupported"; query; message; relatedResults }
  | { kind: "error"; message };
```

`POST /api/search` validates its own output with `websiteSearchResponseSchema` before
responding, so an `answered` response missing a citation, or any off-domain/non-HTTPS URL,
can never reach the browser.

## Provider selection: local vs Bedrock

`RAG_PROVIDER` selects the backend (`src/lib/rag/provider.ts`):

| `RAG_PROVIDER` | Behavior |
| --- | --- |
| `local` (default) | Fully offline official-source corpus + deterministic pipeline. Used for tests and demos; performs **no** network calls. |
| `bedrock` | **Live** Amazon Bedrock Knowledge Base (`bedrockProvider.ts`): `RetrieveAndGenerate` against a VECTOR KB → answer synthesized from retrieved evidence → references mapped to the **same** citation contract. Never silently falls back to local; config/service problems return a safe *service-unavailable* response. See [INTEGRATIONS.md](INTEGRATIONS.md) for AWS/IAM setup. |

### Environment variables

Placeholders live in `.env.example`; real values go only in `.env.local` (gitignored) or the
deployment environment — never committed, never exposed via `NEXT_PUBLIC_*`.

```bash
RAG_PROVIDER=local                 # or "bedrock"

# Required only when RAG_PROVIDER=bedrock (server-only):
BEDROCK_KB_TYPE=vector             # vector | managed
AWS_REGION=us-west-2
BEDROCK_KNOWLEDGE_BASE_ID=replace-with-kb-id      # 10-char id
BEDROCK_MODEL_ARN=replace-with-model-or-inference-profile-arn
BEDROCK_NUMBER_OF_RESULTS=8        # 1-20
BEDROCK_REQUEST_TIMEOUT_MS=15000   # 1000-60000
```

Credentials come from the AWS default provider chain (never hard-coded). AWS config is read
only in server code and never bundled into the client. Full AWS/IAM setup: [INTEGRATIONS.md](INTEGRATIONS.md).

## Functional boundaries

- **Working:** AI search (open/close, submit, answer, citations), official source links,
  floating assistant, mobile menu open/close.
- **Static/inactive:** all ordinary navigation, promotional cards, interest cards, event and
  news items — rendered as accessible inactive controls (`aria-disabled`), never fake links.
- Only the official source links returned by search/chat navigate (to the real pages).
