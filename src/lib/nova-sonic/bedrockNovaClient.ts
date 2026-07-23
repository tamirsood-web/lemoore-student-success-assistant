// The real Bedrock bidirectional invoke for Nova 2 Sonic (server/script-only).
//
// This is the ONLY module that imports the Bedrock runtime SDK, so the rest of the nova-sonic
// library stays SDK-free and testable. Credentials come from the AWS default provider chain
// (SSO/role/env) — never hard-coded. Nothing here is imported by browser code.

import {
  BedrockRuntimeClient,
  InvokeModelWithBidirectionalStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { NovaInvoke, InputChunk, OutputChunk } from "./session";

let cached: BedrockRuntimeClient | undefined;
let cachedRegion: string | undefined;

function client(region: string): BedrockRuntimeClient {
  if (!cached || cachedRegion !== region) {
    cached = new BedrockRuntimeClient({ region });
    cachedRegion = region;
  }
  return cached;
}

/** Build a NovaInvoke bound to a region using the real Bedrock bidirectional stream. */
export function createBedrockNovaInvoke(region: string): NovaInvoke {
  return async ({ modelId, body }) => {
    const command = new InvokeModelWithBidirectionalStreamCommand({
      modelId,
      body: body as AsyncIterable<InputChunk>,
    });
    const response = await client(region).send(command);
    // The SDK yields an async iterable of chunk events on `response.body`.
    return (response.body ?? (async function* () {})()) as AsyncIterable<OutputChunk>;
  };
}
