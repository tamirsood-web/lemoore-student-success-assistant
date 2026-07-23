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
import type { BedrockConfig, BedrockConfigResult } from "./bedrockConfig";

const BASE_CONFIG: BedrockConfig = {
  region: "us-west-2",
  knowledgeBaseId: "ABCDEF1234",
  modelArn: "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
  numberOfResults: 8,
  timeoutMs: 15000,
  strategy: "combined",
  dataSourceIds: {},
};
const OK: BedrockConfigResult = { status: "ok", config: BASE_CONFIG };
const S3_ID = "S3SOURCE01";
const S3_FIRST_CONFIG: BedrockConfig = {
  ...BASE_CONFIG,
  strategy: "s3-first",
  dataSourceIds: { s3: S3_ID, crawler: "CRAWLERID9" },
};
const S3_FIRST: BedrockConfigResult = { status: "ok", config: S3_FIRST_CONFIG };

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
    expect(kb.modelArn).toBe(BASE_CONFIG.modelArn);
    expect(kb.retrievalConfiguration.vectorSearchConfiguration.numberOfResults).toBe(8);
    // combined strategy → no data-source filter.
    expect(
      (kb.retrievalConfiguration.vectorSearchConfiguration as { filter?: unknown }).filter,
    ).toBeUndefined();

    expect(res.kind).toBe("answered");
  });

  it("adds a reserved-key data-source filter for the s3-first strategy's S3 call", async () => {
    const svc = createBedrockSearchService(S3_FIRST); // real default path, SDK mocked
    await svc.answer("How do I register?");

    expect(h.commandInputs).toHaveLength(1); // S3 answered → no crawler call
    const input = h.commandInputs[0] as {
      retrieveAndGenerateConfiguration: {
        knowledgeBaseConfiguration: {
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: number;
              filter?: { equals?: { key?: string; value?: string } };
            };
          };
        };
      };
    };
    const vsc =
      input.retrieveAndGenerateConfiguration.knowledgeBaseConfiguration.retrievalConfiguration
        .vectorSearchConfiguration;
    expect(vsc.filter?.equals?.key).toBe("x-amz-bedrock-kb-data-source-id");
    expect(vsc.filter?.equals?.value).toBe(S3_ID);
  });
});
