// Zod-validated application environment configuration (server-only).
//
// AWS-related variables are all OPTIONAL so the local MVP boots with no AWS credentials
// (requirements.md Req 9.4). Empty-string values in a `.env` file are treated as unset.
// This module reads `process.env`; it must only be imported from server code.

import { z } from "zod";
import { safeParse, type ValidationResult } from "./parse";

/** Default question-length limit; matches the value shipped in `.env.example`. */
export const DEFAULT_CHAT_MAX_INPUT_CHARS = 2000;

/** Upper sanity bound so a misconfigured value can't disable the length guard entirely. */
const CHAT_MAX_INPUT_CHARS_CEILING = 20000;

/** Optional string that treats empty/whitespace-only env values as unset (undefined). */
const optionalEnvString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(1).optional(),
);

/** Optional bounded integer from env; empty/unset becomes the provided default. */
function boundedIntFromEnv(min: number, max: number, fallback: number) {
  return z.preprocess(
    (value) =>
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
        ? fallback
        : value,
    z.coerce
      .number()
      .int()
      .min(min)
      .max(max),
  );
}

/** Parse common truthy/falsy env spellings into a boolean; unset becomes `false`. */
const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off", ""].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const RawEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  NEXT_PUBLIC_APP_NAME: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().default("Lemoore Student Success Assistant"),
  ),

  CHAT_MAX_INPUT_CHARS: z.coerce
    .number({ invalid_type_error: "CHAT_MAX_INPUT_CHARS must be a number." })
    .int("CHAT_MAX_INPUT_CHARS must be a whole number.")
    .positive("CHAT_MAX_INPUT_CHARS must be greater than zero.")
    .max(
      CHAT_MAX_INPUT_CHARS_CEILING,
      `CHAT_MAX_INPUT_CHARS must be at most ${CHAT_MAX_INPUT_CHARS_CEILING}.`,
    )
    .default(DEFAULT_CHAT_MAX_INPUT_CHARS),

  ENABLE_ADMIN_SOURCE_SYNC: booleanFromEnv,

  // RAG provider selection: "local" (default, offline) or "bedrock".
  RAG_PROVIDER: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.enum(["local", "bedrock"]).default("local"),
  ),

  // Bedrock Knowledge Base type. Optional at the env level (only meaningful in bedrock
  // mode); the bedrock config resolver requires + validates it when RAG_PROVIDER=bedrock.
  BEDROCK_KB_TYPE: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.enum(["vector", "managed"]).optional(),
  ),

  // Server-only production retrieval strategy. Defaults to "s3-first" in bedrock mode (applied
  // by the bedrock config resolver). "combined" is retained for diagnostics/evaluation only.
  BEDROCK_RETRIEVAL_STRATEGY: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.enum(["s3-first", "combined", "s3", "crawler"]).optional(),
  ),
  // Data-source ids used ONLY server-side to filter retrieval to one source via the reserved
  // Bedrock metadata key. Never prefixed NEXT_PUBLIC_, so they never reach the browser bundle.
  BEDROCK_DATA_SOURCE_ID: optionalEnvString,
  BEDROCK_WEB_CRAWLER_DATA_SOURCE_ID: optionalEnvString,

  // --- AWS (all optional at env level; app boots without them in local mode) ---
  // KB id / model ARN structure is validated in the bedrock config resolver (bedrock mode
  // only), so a placeholder value can't break local boot. The two numeric settings are
  // bounded ints with safe defaults, so they are always well-formed.
  AWS_REGION: optionalEnvString,
  BEDROCK_MODEL_ID: optionalEnvString,
  BEDROCK_MODEL_ARN: optionalEnvString,
  BEDROCK_KNOWLEDGE_BASE_ID: optionalEnvString,
  BEDROCK_NUMBER_OF_RESULTS: boundedIntFromEnv(1, 20, 8),
  BEDROCK_REQUEST_TIMEOUT_MS: boundedIntFromEnv(1000, 60000, 15000),
  BEDROCK_GUARDRAIL_ID: optionalEnvString,
  BEDROCK_GUARDRAIL_VERSION: optionalEnvString,
  COGNITO_USER_POOL_ID: optionalEnvString,
  COGNITO_CLIENT_ID: optionalEnvString,
  COGNITO_DOMAIN: optionalEnvString,
  DYNAMODB_TABLE_NAME: optionalEnvString,
});

/** Validated, normalized application configuration. */
export const EnvSchema = RawEnvSchema.transform((raw) => ({
  nodeEnv: raw.NODE_ENV,
  appName: raw.NEXT_PUBLIC_APP_NAME,
  chatMaxInputChars: raw.CHAT_MAX_INPUT_CHARS,
  enableAdminSourceSync: raw.ENABLE_ADMIN_SOURCE_SYNC,
  ragProvider: raw.RAG_PROVIDER,
  aws: {
    region: raw.AWS_REGION,
    bedrock: {
      modelId: raw.BEDROCK_MODEL_ID,
      modelArn: raw.BEDROCK_MODEL_ARN,
      knowledgeBaseId: raw.BEDROCK_KNOWLEDGE_BASE_ID,
      kbType: raw.BEDROCK_KB_TYPE,
      retrievalStrategy: raw.BEDROCK_RETRIEVAL_STRATEGY,
      dataSourceId: raw.BEDROCK_DATA_SOURCE_ID,
      webCrawlerDataSourceId: raw.BEDROCK_WEB_CRAWLER_DATA_SOURCE_ID,
      numberOfResults: raw.BEDROCK_NUMBER_OF_RESULTS,
      timeoutMs: raw.BEDROCK_REQUEST_TIMEOUT_MS,
      guardrailId: raw.BEDROCK_GUARDRAIL_ID,
      guardrailVersion: raw.BEDROCK_GUARDRAIL_VERSION,
    },
    cognito: {
      userPoolId: raw.COGNITO_USER_POOL_ID,
      clientId: raw.COGNITO_CLIENT_ID,
      domain: raw.COGNITO_DOMAIN,
    },
    dynamoTableName: raw.DYNAMODB_TABLE_NAME,
  },
}));

export type AppConfig = z.infer<typeof EnvSchema>;

/** Safely validate an env source, returning a structured result (never throws). */
export function parseEnv(
  source: Record<string, string | undefined> = process.env,
): ValidationResult<AppConfig> {
  return safeParse(EnvSchema, source);
}

/**
 * Validate an env source, throwing a readable aggregated error on failure. Intended for
 * fail-fast use at server startup.
 */
export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): AppConfig {
  const result = parseEnv(source);
  if (!result.success) {
    const detail = result.issues
      .map((issue) => ` - ${issue.path}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${detail}`);
  }
  return result.data;
}

let cached: AppConfig | undefined;

/**
 * Return the process configuration, memoized after first successful load. Passing an
 * explicit `source` bypasses the cache (useful in tests).
 */
export function getEnv(
  source?: Record<string, string | undefined>,
): AppConfig {
  if (source) return loadEnv(source);
  if (!cached) cached = loadEnv(process.env);
  return cached;
}
