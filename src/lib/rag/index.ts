// Barrel for the shared RAG answer pipeline. Import from "@/lib/rag".

export { rewriteQuery, tokenize, type RewrittenQuery } from "./queryRewriter";
export { localRetriever, type KnowledgeRetriever, type ScoredChunk } from "./retriever";
export { rerank, type RankedSource } from "./reranker";
export { generateGroundedAnswer, type GroundedAnswer } from "./answerGenerator";
export { toCitation, toCitations } from "./citationMapper";
export { screenForSharedIdentifiers, type PrivacyVerdict } from "./privacy";
export {
  createSearchAnswerService,
  searchAnswerService,
  type SearchAnswerService,
} from "./searchAnswerService";
export {
  getSearchProvider,
  resolveRagProvider,
  __resetSearchProviderForTests,
} from "./provider";
export { createBedrockSearchService, type RunRagFn } from "./bedrockProvider";
export {
  resolveBedrockConfig,
  type BedrockConfig,
  type BedrockConfigResult,
} from "./bedrockConfig";
export { normalizeBedrockResponse, type BedrockRagOutput } from "./bedrockNormalize";
export {
  classifyError,
  safeErrorResponse,
  SERVICE_UNAVAILABLE_MESSAGE,
  type BedrockErrorCategory,
} from "./bedrockErrors";
export { EXAMPLE_QUESTIONS, DEFAULT_SUGGESTIONS } from "./examples";
