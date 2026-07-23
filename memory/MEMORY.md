# Memory index

- [S3 metadata sidecars not retrieved](s3-metadata-sidecars-not-retrieved.md) — root cause of S3-only 0/45 was the S3 data source's inclusion prefix (RAG-DATA/, not lemoore/); since fixed.
- [Live Bedrock three-scope eval](live-bedrock-eval-three-scope.md) — post-fix: combined 29 / s3 42 / crawler 17; how to run scoped evals and which AWS profile to use.
- [Bedrock s3-first strategy](bedrock-s3-first-strategy.md) — production retrieval strategy (s3-first, crawler fallback); config + provider behavior.
