import { describe, it, expect } from "vitest";
import {
  isConfirmed,
  resolveUploadDecision,
  resolveSyncDecision,
} from "./execution";

const fullUpload = {
  region: "us-west-2",
  bucket: "example-bucket",
  prefix: "lemoore/",
};
const fullSync = {
  region: "us-west-2",
  knowledgeBaseId: "ABCDE12345",
  dataSourceId: "DS1234567",
};

describe("isConfirmed", () => {
  it("is false without a confirmation flag", () => {
    expect(isConfirmed(["build"])).toBe(false);
  });
  it("is true with --confirm or --yes", () => {
    expect(isConfirmed(["upload", "--confirm"])).toBe(true);
    expect(isConfirmed(["upload", "--yes"])).toBe(true);
  });
});

describe("resolveUploadDecision", () => {
  it("defaults to dry-run when not confirmed (even with full config)", () => {
    const d = resolveUploadDecision({ confirmed: false, config: fullUpload });
    expect(d.action).toBe("dry-run");
  });

  it("requires confirmation to execute", () => {
    const d = resolveUploadDecision({ confirmed: true, config: fullUpload });
    expect(d.action).toBe("execute");
  });

  it("aborts (does not execute) when confirmed but config is missing", () => {
    const d = resolveUploadDecision({ confirmed: true, config: { prefix: "lemoore/" } });
    expect(d.action).toBe("abort");
    if (d.action === "abort") {
      expect(d.reason).toContain("BEDROCK_SOURCE_BUCKET");
      expect(d.reason).toContain("AWS_REGION");
    }
  });
});

describe("resolveSyncDecision", () => {
  it("defaults to dry-run when not confirmed", () => {
    expect(resolveSyncDecision({ confirmed: false, config: fullSync }).action).toBe("dry-run");
  });

  it("requires confirmation to execute", () => {
    expect(resolveSyncDecision({ confirmed: true, config: fullSync }).action).toBe("execute");
  });

  it("aborts when confirmed but the data source / KB id is missing", () => {
    const d = resolveSyncDecision({ confirmed: true, config: { region: "us-west-2" } });
    expect(d.action).toBe("abort");
    if (d.action === "abort") {
      expect(d.reason).toContain("BEDROCK_KNOWLEDGE_BASE_ID");
      expect(d.reason).toContain("BEDROCK_DATA_SOURCE_ID");
    }
  });
});
