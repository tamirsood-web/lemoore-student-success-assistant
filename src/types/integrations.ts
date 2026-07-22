// AWS integration seam types (INTERFACES ONLY — no AWS SDK, no credentials, no calls).
//
// These forward-looking seams describe how the managed AWS services in AGENTS.md §5 /
// docs/ARCHITECTURE.md would attach to the app without reshaping it. Today the app is
// served entirely by local mock implementations (retrieval, search, guardrails). Each seam
// below has a documented local counterpart and a documented AWS target in
// docs/INTEGRATIONS.md. Keeping these as pure types means adopting a service is an
// implementation swap, not a rewrite.

import type { RetrievalResult } from "./retrieval";
import type { SearchProvider } from "./search";

/**
 * Foundation-model inference seam (target: Amazon Bedrock `InvokeModel` /
 * `Converse`). The model id is injected (never hard-coded), per ARCHITECTURE.md.
 */
export interface FoundationModelClient {
  readonly modelId: string;
  /** Generate an answer from an already-assembled, grounded prompt. */
  generate(input: {
    readonly prompt: string;
    readonly maxTokens?: number;
  }): Promise<{ readonly text: string }>;
}

/**
 * Managed retrieval-augmented-generation seam (target: Amazon Bedrock Knowledge Bases
 * `RetrieveAndGenerate` / `Retrieve`). It returns the SAME normalized {@link RetrievalResult}
 * the local mock `retrieve()` returns, so the server route and answer contract are agnostic
 * to which is in use. A Knowledge Base provider can ALSO back website search by satisfying
 * {@link SearchProvider}.
 */
export interface KnowledgeBaseRetriever {
  readonly knowledgeBaseId: string;
  retrieve(query: string): Promise<RetrievalResult>;
}

/** A KB-backed website search provider is simply a {@link SearchProvider}. */
export type KnowledgeBaseSearchProvider = SearchProvider;

/**
 * Approved-document ingestion seam (target: Amazon S3 private bucket + Bedrock Knowledge
 * Base data source sync). Uploads/registers approved sources and triggers indexing. Never
 * ingests private student records (AGENTS.md §13).
 */
export interface DocumentIngestionService {
  register(document: {
    readonly title: string;
    readonly department: string;
    readonly bytes: ArrayBuffer;
    readonly contentType: string;
  }): Promise<{ readonly documentId: string }>;
  /** Kick off (or observe) a knowledge-base sync after documents change. */
  sync(): Promise<{ readonly status: "started" | "in_progress" | "complete" }>;
}

/**
 * Vector-search seam (target: Amazon OpenSearch Serverless collection created/connected by
 * the Knowledge Base). Exposed only for advanced/diagnostic use; the normal path is the
 * managed {@link KnowledgeBaseRetriever}.
 */
export interface VectorSearchClient {
  readonly indexName: string;
  query(input: {
    readonly text: string;
    readonly topK: number;
  }): Promise<
    ReadonlyArray<{ readonly sourceId: string; readonly score: number }>
  >;
}
