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
import { classifyError, safeErrorResponse, type BedrockErrorCategory } from "./bedrockErrors";
import { runRetrieveAndGenerate } from "./bedrockClient";

/**
 * Bedrock's reserved metadata key. Filtering RetrieveAndGenerate on this key with a data-source
 * id restricts retrieval to one source. The id VALUE is server-only and never logged or returned.
 */
const BEDROCK_DATA_SOURCE_METADATA_KEY = "x-amz-bedrock-kb-data-source-id";

/**
 * AWS error categories that are transient enough to justify a crawler fallback after an S3
 * failure. Non-transient categories (config/validation/access/not-found/unknown) indicate a real
 * problem the crawler would likely hit too, so they map straight to a safe error.
 */
const TRANSIENT_ERRORS: ReadonlySet<BedrockErrorCategory> = new Set([
  "throttling",
  "quota_exceeded",
  "timeout",
  "network",
  "dependency",
]);

/**
 * Injectable Bedrock call, so tests never touch AWS. `dataSourceId` (when provided) scopes
 * retrieval to a single data source via the reserved metadata key; omit it for whole-KB
 * (combined) retrieval.
 */
export type RunRagFn = (
  config: BedrockConfig,
  text: string,
  dataSourceId?: string,
) => Promise<BedrockRagOutput>;

/** Default: build the RetrieveAndGenerate request and call the real client with a timeout. */
const defaultRunRag: RunRagFn = async (config, text, dataSourceId) => {
  const vectorSearchConfiguration = dataSourceId
    ? {
        numberOfResults: config.numberOfResults,
        filter: { equals: { key: BEDROCK_DATA_SOURCE_METADATA_KEY, value: dataSourceId } },
      }
    : { numberOfResults: config.numberOfResults };

  const output = await runRetrieveAndGenerate(
    config.region,
    {
      input: { text },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: config.knowledgeBaseId,
          modelArn: config.modelArn,
          retrievalConfiguration: { vectorSearchConfiguration },
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

/**
 * Redacted, minimized log line. Never includes query/answer/excerpts/data-source IDs/credentials.
 * `path` is a coarse label describing which retrieval route produced the result (e.g. "s3",
 * "crawler-fallback") — it names the ROUTE, never an id.
 */
function logSafe(fields: {
  correlationId: string;
  category: string;
  durationMs: number;
  strategy?: string;
  path?: string;
}): void {
  console.info("[search:bedrock]", {
    provider: "bedrock",
    correlationId: fields.correlationId,
    category: fields.category,
    durationMs: fields.durationMs,
    ...(fields.strategy ? { strategy: fields.strategy } : {}),
    ...(fields.path ? { path: fields.path } : {}),
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

      const config = configResult.config;
      const query = rawQuery.trim();
      const strategy = config.strategy;

      // Preserve privacy screening BEFORE any Bedrock call; never echo the detected value.
      const privacy = screenForSharedIdentifiers(query);
      if (privacy.sensitive) {
        logSafe({ correlationId: cid, category: "blocked_privacy", durationMs: duration(), strategy });
        return { kind: "unsupported", query, message: privacy.message, relatedResults: [] };
      }

      // One scoped retrieval attempt. `ok:false` carries a safe internal error category; the
      // AWS error is never surfaced. A successful call is normalized through the SAME evidence +
      // citation rules used everywhere, so "answered" == "sufficient evidence with valid citations".
      type Attempt =
        | { ok: true; response: WebsiteSearchResponse }
        | { ok: false; category: BedrockErrorCategory };
      const attempt = async (dataSourceId?: string): Promise<Attempt> => {
        try {
          const output = await runRag(config, query, dataSourceId);
          return { ok: true, response: normalizeBedrockResponse(query, output) };
        } catch (err) {
          return { ok: false, category: classifyError(err) };
        }
      };
      const isSufficient = (r: WebsiteSearchResponse): boolean => r.kind === "answered";
      const done = (response: WebsiteSearchResponse, path: string): WebsiteSearchResponse => {
        logSafe({ correlationId: cid, category: response.kind, durationMs: duration(), strategy, path });
        return response;
      };
      const fail = (category: BedrockErrorCategory, path: string): WebsiteSearchResponse => {
        logSafe({ correlationId: cid, category: `error_${category}`, durationMs: duration(), strategy, path });
        return safeErrorResponse();
      };

      const s3Id = config.dataSourceIds.s3;
      const crawlerId = config.dataSourceIds.crawler;

      // Single-source strategies (combined = whole KB; s3/crawler = one source). A strategy that
      // needs an absent id degrades to unfiltered retrieval with an internal warning (it is the
      // only option without ids) rather than failing the whole site.
      if (strategy === "combined" || strategy === "s3" || strategy === "crawler") {
        let id: string | undefined;
        let path: string = strategy;
        if (strategy === "s3") {
          if (s3Id) id = s3Id;
          else {
            console.error("[search:bedrock] strategy=s3 but BEDROCK_DATA_SOURCE_ID is unset; using unfiltered retrieval.");
            path = "combined-degraded";
          }
        } else if (strategy === "crawler") {
          if (crawlerId) id = crawlerId;
          else {
            console.error("[search:bedrock] strategy=crawler but BEDROCK_WEB_CRAWLER_DATA_SOURCE_ID is unset; using unfiltered retrieval.");
            path = "combined-degraded";
          }
        }
        const r = await attempt(id);
        return r.ok ? done(r.response, path) : fail(r.category, path);
      }

      // --- s3-first (production default) ---
      // Query the curated S3 source first; use it when it has sufficient evidence + valid
      // citations. Fall back to the crawler only when S3 is unsupported/invalid or fails
      // transiently — never combine weak evidence into a confident answer.
      if (!s3Id) {
        console.error("[search:bedrock] strategy=s3-first but BEDROCK_DATA_SOURCE_ID is unset; using unfiltered retrieval.");
        const r = await attempt(undefined);
        return r.ok ? done(r.response, "combined-degraded") : fail(r.category, "combined-degraded");
      }

      const s3 = await attempt(s3Id);
      if (s3.ok && isSufficient(s3.response)) return done(s3.response, "s3");

      // A non-transient S3 error is a real problem the crawler would likely share → safe error
      // (do not mask a misconfiguration behind the crawler).
      if (!s3.ok && !TRANSIENT_ERRORS.has(s3.category)) return fail(s3.category, "s3");

      // S3 was unsupported, or failed transiently → attempt the crawler when configured.
      if (!crawlerId) {
        return s3.ok ? done(s3.response, "s3-unsupported") : fail(s3.category, "s3");
      }

      const crawler = await attempt(crawlerId);
      if (crawler.ok && isSufficient(crawler.response)) return done(crawler.response, "crawler-fallback");

      // Neither source produced a sufficient, well-cited answer.
      if (crawler.ok) {
        // Prefer S3's unsupported response when we have it (keeps any related results).
        return done(s3.ok ? s3.response : crawler.response, "unsupported");
      }
      // Crawler errored: return S3's unsupported if present, else a safe error.
      return s3.ok ? done(s3.response, "unsupported") : fail(crawler.category, "crawler-fallback");
    },
  };
}
