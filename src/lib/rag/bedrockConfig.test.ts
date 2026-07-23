import { describe, it, expect } from "vitest";
import { resolveBedrockConfig } from "./bedrockConfig";
import type { AppConfig } from "@/lib/validation";

const VALID_ARN =
  "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0";
const VALID_PROFILE_ARN =
  "arn:aws:bedrock:us-west-2:123456789012:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0";

function env(bedrock: Partial<AppConfig["aws"]["bedrock"]>, region = "us-west-2"): AppConfig {
  return {
    aws: {
      region,
      bedrock: {
        kbType: "vector",
        knowledgeBaseId: "ABCDEF1234",
        modelArn: VALID_ARN,
        numberOfResults: 8,
        timeoutMs: 15000,
        ...bedrock,
      },
    },
  } as unknown as AppConfig;
}

describe("resolveBedrockConfig", () => {
  it("resolves a valid vector configuration", () => {
    const r = resolveBedrockConfig(env({}));
    expect(r.status).toBe("ok");
    if (r.status === "ok") {
      expect(r.config.knowledgeBaseId).toBe("ABCDEF1234");
      expect(r.config.modelArn).toBe(VALID_ARN);
      expect(r.config.numberOfResults).toBe(8);
    }
  });

  it("accepts an inference-profile ARN", () => {
    expect(resolveBedrockConfig(env({ modelArn: VALID_PROFILE_ARN })).status).toBe("ok");
  });

  it("refuses managed KB type (RetrieveAndGenerate not supported)", () => {
    const r = resolveBedrockConfig(env({ kbType: "managed" }));
    expect(r.status).toBe("managed");
  });

  it("fails when kbType is missing", () => {
    expect(resolveBedrockConfig(env({ kbType: undefined })).status).toBe("invalid");
  });

  it("fails when region is missing/malformed", () => {
    expect(resolveBedrockConfig(env({}, "")).status).toBe("invalid");
    expect(resolveBedrockConfig(env({}, "not a region")).status).toBe("invalid");
  });

  it("fails when KB id is missing or not a 10-char id", () => {
    expect(resolveBedrockConfig(env({ knowledgeBaseId: undefined })).status).toBe("invalid");
    expect(resolveBedrockConfig(env({ knowledgeBaseId: "replace-with-kb-id" })).status).toBe(
      "invalid",
    );
  });

  it("fails when model ARN is missing or malformed", () => {
    expect(resolveBedrockConfig(env({ modelArn: undefined })).status).toBe("invalid");
    expect(resolveBedrockConfig(env({ modelArn: "not-an-arn" })).status).toBe("invalid");
  });

  it("fails when the retrieval count is out of range", () => {
    expect(resolveBedrockConfig(env({ numberOfResults: 0 })).status).toBe("invalid");
    expect(resolveBedrockConfig(env({ numberOfResults: 99 })).status).toBe("invalid");
  });

  it("never leaks internal detail as a public field (detail is a plain string only)", () => {
    const r = resolveBedrockConfig(env({ knowledgeBaseId: undefined }));
    if (r.status === "invalid") expect(typeof r.detail).toBe("string");
  });

  it("defaults the retrieval strategy to s3-first when unset", () => {
    const r = resolveBedrockConfig(env({}));
    expect(r.status === "ok" && r.config.strategy).toBe("s3-first");
  });

  it("respects an explicit retrieval strategy and surfaces data-source ids", () => {
    const r = resolveBedrockConfig(
      env({ retrievalStrategy: "combined", dataSourceId: "S3SOURCE01", webCrawlerDataSourceId: "CRAWLERID9" }),
    );
    expect(r.status).toBe("ok");
    if (r.status === "ok") {
      expect(r.config.strategy).toBe("combined");
      expect(r.config.dataSourceIds).toEqual({ s3: "S3SOURCE01", crawler: "CRAWLERID9" });
    }
  });

  it("falls back to s3-first for an unrecognized strategy value", () => {
    const r = resolveBedrockConfig(env({ retrievalStrategy: "bogus" as never }));
    expect(r.status === "ok" && r.config.strategy).toBe("s3-first");
  });

  it("resolves ok even without data-source ids (provider degrades at request time)", () => {
    const r = resolveBedrockConfig(env({ retrievalStrategy: "s3-first" }));
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.config.dataSourceIds).toEqual({});
  });
});
