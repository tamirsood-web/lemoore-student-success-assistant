// Lazily-initialized BedrockAgentRuntimeClient (server-only).
//
// The AWS SDK is imported ONLY here (and re-exported types), so it never reaches the client
// bundle. Credentials come from the AWS default provider chain (env, shared config, or an
// IAM execution role) — never hard-coded. The client is memoized per region. The per-request
// timeout is applied by the caller via an AbortSignal, so no custom request handler is needed.

import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
  type RetrieveAndGenerateCommandInput,
  type RetrieveAndGenerateCommandOutput,
} from "@aws-sdk/client-bedrock-agent-runtime";

let cached: BedrockAgentRuntimeClient | undefined;
let cachedRegion: string | undefined;

/** Return a memoized BedrockAgentRuntimeClient for the given region. */
export function getBedrockClient(region: string): BedrockAgentRuntimeClient {
  if (!cached || cachedRegion !== region) {
    cached = new BedrockAgentRuntimeClient({ region });
    cachedRegion = region;
  }
  return cached;
}

/**
 * Run RetrieveAndGenerate against the configured region with a hard timeout. This is the
 * single real AWS call site. Callers may inject a substitute for tests so no network occurs.
 */
export async function runRetrieveAndGenerate(
  region: string,
  input: RetrieveAndGenerateCommandInput,
  timeoutMs: number,
): Promise<RetrieveAndGenerateCommandOutput> {
  const client = getBedrockClient(region);
  return client.send(new RetrieveAndGenerateCommand(input), {
    abortSignal: AbortSignal.timeout(timeoutMs),
  });
}

export type {
  RetrieveAndGenerateCommandInput,
  RetrieveAndGenerateCommandOutput,
};
