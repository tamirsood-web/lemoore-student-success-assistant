---
name: s3-metadata-sidecars-not-retrieved
description: Root cause of S3-only retrieval 0/45 — S3 data source inclusion prefix is RAG-DATA/, not lemoore/
metadata:
  type: project
---

The curated S3 corpus WAS uploaded (38 `.md` + 38 `.metadata.json` under `lemoore/`) and synced (COMPLETE) before the three-way eval (2026-07-22). S3-only retrieval still returned 0/45 usable.

**Confirmed root cause (read-only AWS diagnosis, 2026-07-22): WRONG S3 INCLUSION PREFIX.**
The KB has 2 data sources: a WEB crawler and one S3 source (= `BEDROCK_DATA_SOURCE_ID`). That S3 source's single `inclusionPrefixes` entry is `RAG-DATA/`, NOT `lemoore/`. So the 38 curated docs under `lemoore/` were never in ingestion scope. The S3 chunks it serves are `RAG-DATA/*.html/.docx` files with no sidecars → no custom metadata → evaluator can't match.

Evidence: latest ingestion job scanned 6 docs / 0 metadata docs; S3-filtered Retrieve returns `RAG-DATA/…` docs with only reserved metadata keys. The `lemoore/` upload is perfect (38/38 paired, no orphans) and all sampled sidecars pass the Bedrock schema (`application/json`, no BOM). So NOT a sidecar/schema/pairing/code defect and NOT the evaluator.

**Fix (manual, AWS — do NOT automate):** UpdateDataSource on the S3 source to set `inclusionPrefixes` to include `lemoore/` (replace or add), then start a new ingestion job. Re-upload NOT needed; re-sync IS needed.

**Secondary blocker to verify first:** OpenSearch Serverless index engine must be `faiss` (not `nmslib`) or sidecar metadata is ignored even after the prefix fix. Could not read the index mapping (aoss data-plane 403 for the SSO principal) — verify in the console.

Full redacted diagnosis: `reports/lemoore-s3-metadata-diagnosis.json`. Related: [[live-bedrock-eval-three-scope]].
