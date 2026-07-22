// SearchProvider selection (server-only).
//
// RAG_PROVIDER selects the implementation backing the shared answer pipeline:
//   - "local"   (default) → fully offline official-source corpus + deterministic pipeline.
//   - "bedrock"           → live Amazon Bedrock Knowledge Base (RetrieveAndGenerate).
//
// The UI/API depend only on the `SearchAnswerService` interface, so swapping providers
// changes no consumer code. AWS config is resolved server-side and never reaches the client.
// In bedrock mode the pipeline NEVER silently falls back to local answers: a config or
// service problem yields a safe service-unavailable response instead.

import type { RagProvider } from "@/types";
import { getEnv } from "@/lib/validation";
import {
  searchAnswerService,
  type SearchAnswerService,
} from "./searchAnswerService";
import { createBedrockSearchService } from "./bedrockProvider";
import { resolveBedrockConfig } from "./bedrockConfig";

/** Read + normalize the configured provider mode (defaults to "local"). */
export function resolveRagProvider(
  raw: string | undefined = process.env.RAG_PROVIDER,
): RagProvider {
  return raw?.trim().toLowerCase() === "bedrock" ? "bedrock" : "local";
}

let cached: SearchAnswerService | undefined;

/** Return the configured shared answer service (memoized). */
export function getSearchProvider(): SearchAnswerService {
  if (cached) return cached;
  const provider = resolveRagProvider();
  cached =
    provider === "bedrock"
      ? createBedrockSearchService(resolveBedrockConfig(getEnv()))
      : searchAnswerService;
  return cached;
}

/** Reset the memoized provider (tests only). */
export function __resetSearchProviderForTests(): void {
  cached = undefined;
}
