// Live Amazon Bedrock Knowledge Base provider (server-only).
//
// Implements the shared SearchAnswerService against a standard/customer-managed VECTOR KB
// via RetrieveAndGenerate. It preserves the same safety front-matter as local mode (privacy
// screening on the raw query, never echoing detected values), calls Bedrock, normalizes the
// response into the shared contract, and maps every failure to a SAFE public response. It
// NEVER silently falls back to local answers, and NEVER logs the question, answer, excerpts,
// citations, KB id, model ARN, account id, or credentials.
//
// The AWS call is injectable (`deps.runRag`) so automated tests exercise the full mapping
// with zero network access.

import type { WebsiteSearchResponse } from "@/types";
import type { SearchAnswerService } from "./searchAnswerService";
import type { BedrockConfig, BedrockConfigResult } from "./bedrockConfig";
import { screenForSharedIdentifiers } from "./privacy";
import { normalizeBedrockResponse, type BedrockRagOutput } from "./bedrockNormalize";
import { classifyError, safeErrorResponse } from "./bedrockErrors";
import { runRetrieveAndGenerate } from "./bedrockClient";

/** Injectable Bedrock call, so tests never touch AWS. */
export type RunRagFn = (
  config: BedrockConfig,
  text: string,
) => Promise<BedrockRagOutput>;

/** Default: build the RetrieveAndGenerate request and call the real client with a timeout. */
const defaultRunRag: RunRagFn = async (config, text) => {
  const output = await runRetrieveAndGenerate(
    config.region,
    {
      input: { text },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: config.knowledgeBaseId,
          modelArn: config.modelArn,
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: config.numberOfResults,
            },
          },
        },
      },
    },
    config.timeoutMs,
  );
  // The SDK output is read defensively by the normalizer (loose shape).
  return output as unknown as BedrockRagOutput;
};

function correlationId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() ?? Math.abs(hash(String(performance.now()))).toString(36);
  } catch {
    return "unknown";
  }
}
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** Redacted, minimized log line. Never includes query/answer/excerpts/IDs/credentials. */
function logSafe(fields: {
  correlationId: string;
  category: string;
  durationMs: number;
}): void {
  console.info("[search:bedrock]", {
    provider: "bedrock",
    correlationId: fields.correlationId,
    category: fields.category,
    durationMs: fields.durationMs,
  });
}

/**
 * Create the Bedrock-backed shared answer service. Given a resolved config result it:
 *  - returns a safe service-unavailable response when config is invalid/managed (logging the
 *    internal reason once per call, without leaking it publicly),
 *  - otherwise runs the live pipeline.
 */
export function createBedrockSearchService(
  configResult: BedrockConfigResult,
  deps: { runRag?: RunRagFn } = {},
): SearchAnswerService {
  const runRag = deps.runRag ?? defaultRunRag;

  return {
    async answer(rawQuery: string): Promise<WebsiteSearchResponse> {
      const started =
        typeof performance !== "undefined" ? performance.now() : 0;
      const cid = correlationId();
      const duration = () =>
        Math.round((typeof performance !== "undefined" ? performance.now() : 0) - started);

      // Configuration problems degrade to a safe public response (never to local answers).
      if (configResult.status !== "ok") {
        // Internal-only explanation; safe to log, never returned to the client.
        console.error("[search:bedrock] configuration unavailable:", configResult.detail);
        logSafe({ correlationId: cid, category: `config_${configResult.status}`, durationMs: duration() });
        return safeErrorResponse();
      }

      const query = rawQuery.trim();

      // Preserve privacy screening BEFORE any Bedrock call; never echo the detected value.
      const privacy = screenForSharedIdentifiers(query);
      if (privacy.sensitive) {
        logSafe({ correlationId: cid, category: "blocked_privacy", durationMs: duration() });
        return { kind: "unsupported", query, message: privacy.message, relatedResults: [] };
      }

      let output: BedrockRagOutput;
      try {
        output = await runRag(configResult.config, query);
      } catch (err) {
        const category = classifyError(err);
        logSafe({ correlationId: cid, category: `error_${category}`, durationMs: duration() });
        return safeErrorResponse();
      }

      const response = normalizeBedrockResponse(query, output);
      logSafe({ correlationId: cid, category: response.kind, durationMs: duration() });
      return response;
    },
  };
}
