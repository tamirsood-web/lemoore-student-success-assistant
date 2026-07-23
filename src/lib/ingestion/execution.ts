// Execution-safety gate for the upload/sync commands (pure; server/script-only).
//
// Dry-run is the DEFAULT for every side-effecting command. A real S3 upload or a real Bedrock
// ingestion job runs ONLY when the operator passes an explicit confirmation flag AND the
// required configuration is present. This module contains the decision logic (no AWS, no I/O)
// so it is fully unit-tested; the CLI script wires it to argv + env.

export const CONFIRM_FLAGS = ["--confirm", "--yes"] as const;

/** True when argv carries an explicit confirmation flag. */
export function isConfirmed(argv: readonly string[]): boolean {
  return argv.some((a) => (CONFIRM_FLAGS as readonly string[]).includes(a));
}

export type ExecutionDecision =
  | { readonly action: "dry-run"; readonly reason: string }
  | { readonly action: "execute" }
  | { readonly action: "abort"; readonly reason: string };

/** Required S3-upload configuration (values resolved from env by the caller). */
export type UploadConfig = {
  readonly region?: string;
  readonly bucket?: string;
  readonly prefix?: string;
};

/** Required Bedrock-sync configuration. */
export type SyncConfig = {
  readonly region?: string;
  readonly knowledgeBaseId?: string;
  readonly dataSourceId?: string;
};

function missingKeys<T extends Record<string, unknown>>(config: T, keys: Array<keyof T>): string[] {
  return keys
    .filter((k) => {
      const v = config[k];
      return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
    })
    .map(String);
}

/**
 * Decide how the upload command should run. Not confirmed → dry-run (never writes). Confirmed
 * but missing config → abort with the exact missing keys. Confirmed + complete → execute.
 */
export function resolveUploadDecision(input: {
  readonly confirmed: boolean;
  readonly config: UploadConfig;
}): ExecutionDecision {
  if (!input.confirmed) {
    return { action: "dry-run", reason: "no --confirm flag; showing planned uploads only" };
  }
  const missing = missingKeys(input.config, ["region", "bucket", "prefix"]);
  if (missing.length > 0) {
    return {
      action: "abort",
      reason: `missing required config for upload: ${missing.map(envNameFor).join(", ")}`,
    };
  }
  return { action: "execute" };
}

/**
 * Decide how the sync command should run. Same contract as upload: dry-run unless explicitly
 * confirmed with complete Knowledge Base + data-source configuration.
 */
export function resolveSyncDecision(input: {
  readonly confirmed: boolean;
  readonly config: SyncConfig;
}): ExecutionDecision {
  if (!input.confirmed) {
    return { action: "dry-run", reason: "no --confirm flag; showing planned sync only" };
  }
  const missing = missingKeys(input.config, ["region", "knowledgeBaseId", "dataSourceId"]);
  if (missing.length > 0) {
    return {
      action: "abort",
      reason: `missing required config for sync: ${missing.map(envNameFor).join(", ")}`,
    };
  }
  return { action: "execute" };
}

/** Map an internal config key to the environment-variable name shown to operators. */
function envNameFor(key: string): string {
  switch (key) {
    case "region":
      return "AWS_REGION";
    case "bucket":
      return "BEDROCK_SOURCE_BUCKET";
    case "prefix":
      return "BEDROCK_SOURCE_PREFIX";
    case "knowledgeBaseId":
      return "BEDROCK_KNOWLEDGE_BASE_ID";
    case "dataSourceId":
      return "BEDROCK_DATA_SOURCE_ID";
    default:
      return key;
  }
}
