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
});
