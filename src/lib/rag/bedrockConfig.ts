// Bedrock Knowledge Base configuration resolution + validation (server-only).
//
// Validates the bedrock-mode settings ONCE, only when RAG_PROVIDER=bedrock, so a placeholder
// value never breaks local boot. Enforces KB type, region, KB-id structure, model/inference
// -profile ARN shape, and bounded result count. `detail` strings are INTERNAL only (safe to
// log) and are never sent to a client.

import type { AppConfig } from "@/lib/validation";

/** Fully validated Bedrock vector-KB configuration. */
export type BedrockConfig = {
  readonly region: string;
  readonly knowledgeBaseId: string;
  readonly modelArn: string;
  readonly numberOfResults: number;
  readonly timeoutMs: number;
};

/** Result of resolving bedrock config: usable, managed (unsupported), or invalid. */
export type BedrockConfigResult =
  | { readonly status: "ok"; readonly config: BedrockConfig }
  | { readonly status: "managed"; readonly detail: string }
  | { readonly status: "invalid"; readonly detail: string };

// Bedrock KB ids are 10-character alphanumeric identifiers.
const KB_ID_PATTERN = /^[A-Za-z0-9]{10}$/;
// foundation-model / inference-profile / application-inference-profile / etc. ARNs.
const MODEL_ARN_PATTERN =
  /^arn:aws[\w-]*:bedrock:[a-z0-9-]+:\d{0,12}:(foundation-model|inference-profile|application-inference-profile|custom-model|provisioned-model|prompt-router|default-prompt-router)\/\S+$/i;
const REGION_PATTERN = /^[a-z]{2}-[a-z-]+-\d+$/;

/**
 * Resolve the Bedrock configuration from the validated app env. Only call this when
 * RAG_PROVIDER=bedrock. Returns a discriminated result rather than throwing so the provider
 * can degrade to a safe public response.
 */
export function resolveBedrockConfig(env: AppConfig): BedrockConfigResult {
  const { region } = env.aws;
  const { kbType, knowledgeBaseId, modelArn, numberOfResults, timeoutMs } =
    env.aws.bedrock;

  if (!kbType) {
    return {
      status: "invalid",
      detail: "BEDROCK_KB_TYPE is required in bedrock mode (expected 'vector' or 'managed').",
    };
  }

  if (kbType === "managed") {
    return {
      status: "managed",
      detail:
        "BEDROCK_KB_TYPE=managed: RetrieveAndGenerate is only implemented for a standard/" +
        "customer-managed VECTOR Knowledge Base. A managed-KB retrieval implementation is required.",
    };
  }

  const problems: string[] = [];
  if (!region || !REGION_PATTERN.test(region)) {
    problems.push("AWS_REGION missing or malformed");
  }
  if (!knowledgeBaseId || !KB_ID_PATTERN.test(knowledgeBaseId)) {
    problems.push("BEDROCK_KNOWLEDGE_BASE_ID missing or not a valid 10-character KB id");
  }
  if (!modelArn || !MODEL_ARN_PATTERN.test(modelArn)) {
    problems.push("BEDROCK_MODEL_ARN missing or not a valid model/inference-profile ARN");
  }
  if (!Number.isInteger(numberOfResults) || numberOfResults < 1 || numberOfResults > 20) {
    problems.push("BEDROCK_NUMBER_OF_RESULTS out of range (1-20)");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
    problems.push("BEDROCK_REQUEST_TIMEOUT_MS out of range (1000-60000)");
  }

  if (problems.length > 0) {
    return { status: "invalid", detail: `Bedrock config invalid: ${problems.join("; ")}.` };
  }

  return {
    status: "ok",
    config: {
      region: region as string,
      knowledgeBaseId: knowledgeBaseId as string,
      modelArn: modelArn as string,
      numberOfResults,
      timeoutMs,
    },
  };
}
