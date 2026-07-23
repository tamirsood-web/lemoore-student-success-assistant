// Bedrock retrieve → generate (two-step, server-only).
//
// Optimized RAG configuration:
// - Retrieves top 3 results (reduced from 5 for speed)
// - Filters by relevance score ≥0.5
// - Truncates chunks to 800 chars max to reduce tokens
// - Uses system message for Anthropic models (more efficient)
// - Deduplicates citations from same source
// - Returns source type for UI badges

import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getEnv } from "@/lib/validation";

export type BedrockSnippet = {
  text: string;
  title: string;
  uri?: string;
  sourceType: "s3" | "web" | "unknown";
  relevanceScore?: number;
};

export type BedrockRetrievalResult = {
  answer: string;
  snippets: BedrockSnippet[];
  noResults: boolean;
};

// ── singleton clients ────────────────────────────────────────────────────────

let _agentClient: BedrockAgentRuntimeClient | null = null;
let _runtimeClient: BedrockRuntimeClient | null = null;

function getAgentClient(): BedrockAgentRuntimeClient {
  if (!_agentClient) {
    _agentClient = new BedrockAgentRuntimeClient({
      region: getEnv().aws.region ?? "us-west-2",
    });
  }
  return _agentClient;
}

function getRuntimeClient(): BedrockRuntimeClient {
  if (!_runtimeClient) {
    _runtimeClient = new BedrockRuntimeClient({
      region: getEnv().aws.region ?? "us-west-2",
    });
  }
  return _runtimeClient;
}

// ── Constants ────────────────────────────────────────────────────────────────

const TOP_K_RESULTS = 3; // Reduced from 5 for speed
const MIN_RELEVANCE_SCORE = 0.5; // Filter low-relevance chunks
const MAX_CHUNK_LENGTH = 800; // Truncate to reduce token usage
const SYSTEM_PROMPT = `You are the Lemoore College Student Success Assistant.
Answer using ONLY the provided sources. Be concise, accurate, and student-friendly.
If sources lack sufficient information, state: "I could not find verified information about that in the approved college sources."
Never invent policies, deadlines, contact details, or course-specific dates.`;

// ── main export ──────────────────────────────────────────────────────────────

export async function retrieve(query: string): Promise<BedrockRetrievalResult> {
  const env = getEnv();
  const knowledgeBaseId = env.aws.bedrock.knowledgeBaseId;
  const modelId = env.aws.bedrock.modelId ?? "amazon.nova-lite-v1:0";

  console.log("[retrieve] Starting with:", { knowledgeBaseId, modelId, queryLength: query.length });

  if (!knowledgeBaseId) {
    console.log("[retrieve] No knowledge base ID configured");
    return { answer: "", snippets: [], noResults: true };
  }

  // ── Step 1: retrieve document chunks (optimized) ─────────────────────────
  const retrieveCmd = new RetrieveCommand({
    knowledgeBaseId,
    retrievalQuery: { text: query },
    retrievalConfiguration: {
      vectorSearchConfiguration: { numberOfResults: TOP_K_RESULTS },
    },
  });

  const retrieveResponse = await getAgentClient().send(retrieveCmd);
  let results = retrieveResponse.retrievalResults ?? [];

  console.log("[retrieve] Retrieved results:", results.length);

  // Filter by relevance score if available
  results = results.filter((r) => {
    const score = r.score ?? 1.0;
    return score >= MIN_RELEVANCE_SCORE;
  });

  console.log("[retrieve] After relevance filtering (≥0.5):", results.length);

  if (results.length === 0) {
    console.log("[retrieve] No results after filtering");
    return { answer: "", snippets: [], noResults: true };
  }

  // Build snippets with source type detection and deduplication
  const seenUris = new Set<string>();
  const snippets: BedrockSnippet[] = [];

  for (const r of results) {
    const text = r.content?.text ?? "";
    const s3Uri = r.location?.s3Location?.uri;
    const webUrl = (r.location as { webLocation?: { url?: string } })?.webLocation
      ?.url;
    const uri = s3Uri ?? webUrl ?? (r.metadata?.["x-amz-bedrock-kb-source-uri"] as string | undefined);

    // Deduplicate by URI
    if (uri && seenUris.has(uri)) continue;
    if (uri) seenUris.add(uri);

    // Determine source type
    const sourceType: "s3" | "web" | "unknown" = s3Uri
      ? "s3"
      : webUrl
        ? "web"
        : "unknown";

    const rawTitle =
      (r.metadata?.["_document_title"] as string | undefined) ??
      (r.metadata?.["x-amz-bedrock-kb-source-uri"] as string | undefined)
        ?.split("/")
        .pop() ??
      (uri ? decodeURIComponent(uri.split("/").pop() ?? "") : "College Source");

    // Truncate chunk to max length
    const truncatedText =
      text.length > MAX_CHUNK_LENGTH
        ? text.slice(0, MAX_CHUNK_LENGTH) + "…"
        : text;

    snippets.push({
      text: truncatedText,
      title: rawTitle.replace(/\.[^.]+$/, ""),
      uri,
      sourceType,
      relevanceScore: r.score,
    });
  }

  if (snippets.length === 0) {
    console.log("[retrieve] No snippets after deduplication");
    return { answer: "", snippets: [], noResults: true };
  }

  console.log("[retrieve] Final snippets:", snippets.length);

  // ── Step 2: generate answer (optimized for token efficiency) ─────────────
  const context = snippets
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.text}`)
    .join("\n\n");

  const userMessage = `Sources:\n${context}\n\nQuestion: ${query}`;

  // Build request body — use system message for Anthropic (more efficient)
  const isAnthropicModel = modelId.includes("anthropic.");
  const requestBody = isAnthropicModel
    ? {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 400, // Reduced from 512 for faster responses
        temperature: 0.1,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: [{ type: "text", text: userMessage }] },
        ],
      }
    : {
        messages: [
          {
            role: "user",
            content: [{ text: `${SYSTEM_PROMPT}\n\n${userMessage}` }],
          },
        ],
        inferenceConfig: { max_new_tokens: 400, temperature: 0.1 },
      };

  const invokeCmd = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(requestBody),
  });

  const invokeResponse = await getRuntimeClient().send(invokeCmd);
  const responseBody = JSON.parse(
    new TextDecoder().decode(invokeResponse.body),
  ) as {
    // Anthropic response shape
    content?: Array<{ text?: string }>;
    // Nova response shape
    output?: { message?: { content?: Array<{ text?: string }> } };
  };

  const answer = (
    responseBody.content?.[0]?.text ??
    responseBody.output?.message?.content?.[0]?.text ??
    ""
  ).trim();

  console.log("[retrieve] Generated answer length:", answer.length);

  return { answer, snippets, noResults: answer === "" };
}
