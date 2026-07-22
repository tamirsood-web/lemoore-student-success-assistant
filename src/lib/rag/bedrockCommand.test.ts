// Verifies the REAL default call path (defaultRunRag + bedrockClient) builds the correct
// RetrieveAndGenerateCommand, by mocking the AWS SDK module. No network occurs.

import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  sendMock: vi.fn(),
  commandInputs: [] as unknown[],
}));

vi.mock("@aws-sdk/client-bedrock-agent-runtime", () => ({
  BedrockAgentRuntimeClient: class {
    send = h.sendMock;
  },
  RetrieveAndGenerateCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
      h.commandInputs.push(input);
    }
  },
}));

import { createBedrockSearchService } from "./bedrockProvider";
import type { BedrockConfigResult } from "./bedrockConfig";

const OK: BedrockConfigResult = {
  status: "ok",
  config: {
    region: "us-west-2",
    knowledgeBaseId: "ABCDEF1234",
    modelArn: "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
    numberOfResults: 8,
    timeoutMs: 15000,
  },
};

beforeEach(() => {
  h.commandInputs.length = 0;
  h.sendMock.mockReset();
  h.sendMock.mockResolvedValue({
    output: { text: "answer" },
    citations: [
      {
        retrievedReferences: [
          {
            content: { text: "excerpt" },
            metadata: { page_title: "T", source_url: "https://lemoorecollege.edu/x" },
          },
        ],
      },
    ],
  });
});

describe("RetrieveAndGenerateCommand construction (default call path, SDK mocked)", () => {
  it("sends the normalized query, configured KB id, model ARN, and result count", async () => {
    const svc = createBedrockSearchService(OK); // no injected runRag -> real default path
    const res = await svc.answer("   How do I register?   ");

    expect(h.sendMock).toHaveBeenCalledTimes(1); // exactly one AWS call, no network
    expect(h.commandInputs).toHaveLength(1);

    const input = h.commandInputs[0] as {
      input: { text: string };
      retrieveAndGenerateConfiguration: {
        type: string;
        knowledgeBaseConfiguration: {
          knowledgeBaseId: string;
          modelArn: string;
          retrievalConfiguration: { vectorSearchConfiguration: { numberOfResults: number } };
        };
      };
    };

    expect(input.input.text).toBe("How do I register?");
    expect(input.retrieveAndGenerateConfiguration.type).toBe("KNOWLEDGE_BASE");
    const kb = input.retrieveAndGenerateConfiguration.knowledgeBaseConfiguration;
    expect(kb.knowledgeBaseId).toBe("ABCDEF1234");
    expect(kb.modelArn).toBe(OK.config.modelArn);
    expect(kb.retrievalConfiguration.vectorSearchConfiguration.numberOfResults).toBe(8);

    expect(res.kind).toBe("answered");
  });
});
