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

  // --- AWS (all optional in this phase; the app boots without them) ---
  AWS_REGION: optionalEnvString,
  BEDROCK_MODEL_ID: optionalEnvString,
  BEDROCK_KNOWLEDGE_BASE_ID: optionalEnvString,
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
  aws: {
    region: raw.AWS_REGION,
    bedrock: {
      modelId: raw.BEDROCK_MODEL_ID,
      knowledgeBaseId: raw.BEDROCK_KNOWLEDGE_BASE_ID,
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
