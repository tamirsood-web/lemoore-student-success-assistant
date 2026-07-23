---
name: bedrock-s3-first-strategy
description: Production Bedrock retrieval uses an s3-first, crawler-fallback strategy
metadata:
  type: project
---

Production website search + floating assistant (bedrock mode) use `BEDROCK_RETRIEVAL_STRATEGY` (server-only, default **`s3-first`**), resolved in `src/lib/rag/bedrockConfig.ts` and executed in `src/lib/rag/bedrockProvider.ts`.

- **s3-first** (default): RetrieveAndGenerate filtered to `BEDROCK_DATA_SOURCE_ID` first; if the normalized result is sufficient (`kind: "answered"` — non-empty text + ≥1 reference + ≥1 valid citation, no guardrail) return it. Otherwise (unsupported/invalid, or a *transient* AWS error) fall back to `BEDROCK_WEB_CRAWLER_DATA_SOURCE_ID`. Non-transient S3 error → safe error (don't mask). Both weak → unsupported. Never combines weak evidence.
- **combined** (no filter), **s3**, **crawler**: diagnostics only.

Filter uses the reserved key `x-amz-bedrock-kb-data-source-id`. Data-source ids are server-only env vars (never NEXT_PUBLIC, never in responses/logs — logs show a coarse `path` label only). If a strategy's required id is unset, the provider logs a warning and degrades to unfiltered retrieval rather than failing.

Sufficiency reuses `normalizeBedrockResponse` verbatim, so all citation rules (titles/URLs/excerpts/order/domain validation/S3-URI rejection/dedup) are preserved and the UI never reveals that two attempts occurred. Both data sources stay attached to the KB. See [[live-bedrock-eval-three-scope]].
