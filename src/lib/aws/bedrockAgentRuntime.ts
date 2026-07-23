// AWS Bedrock Agent Runtime client singleton (server-only).
// Never import this from client components.

import { BedrockAgentRuntimeClient } from "@aws-sdk/client-bedrock-agent-runtime";
import { getEnv } from "@/lib/validation";

let client: BedrockAgentRuntimeClient | null = null;

export function getBedrockAgentRuntimeClient(): BedrockAgentRuntimeClient {
  if (!client) {
    const env = getEnv();
    client = new BedrockAgentRuntimeClient({
      region: env.aws.region ?? "us-west-2",
    });
  }
  return client;
}
