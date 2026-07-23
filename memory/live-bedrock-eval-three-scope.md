---
name: live-bedrock-eval-three-scope
description: Three-scope retrieval eval results (combined/s3/crawler) and what they revealed
metadata:
  type: project
---

`npm run sources:evaluate -- --scope <combined|s3|crawler>` runs a diagnostic retrieval eval. Scope filters use the reserved metadata key `x-amz-bedrock-kb-data-source-id`; combined sends no filter (production default). Reports (KB/data-source ids redacted): `reports/lemoore-eval-{results,combined,s3,crawler}.json` + `lemoore-eval-comparison.{json,md}`.

Live results AFTER the inclusion-prefix fix (see [[s3-metadata-sidecars-not-retrieved]]): **combined 29/45, s3 42/45, crawler 17/45**. Curated S3 now dominates; crawler's usable set is a strict SUBSET of S3's (crawler answers nothing S3 doesn't; S3 uniquely answers 25). (Before the prefix fix it was combined 17 / s3 0 / crawler 17.)

Production therefore uses an **s3-first** retrieval strategy (see [[bedrock-s3-first-strategy]]): query S3 first, fall back to crawler only when S3 is unsupported/invalid or transiently fails. Remaining S3 eval-failures q03/q06/q07 are keyword/ranking gaps (expected pages exist), not missing content.

The eval logic is a pure, tested module `src/lib/ingestion/evaluation.ts` (no AWS/network; ids injected, never read from env there). Live retrieval needs AWS creds — the sandbox default chain was empty; use `AWS_PROFILE=myisb_IsbUsersPS-962448382783` (SSO session `lemoore-sso`).
