import { describe, it, expect, afterEach } from "vitest";
import {
  resolveRagProvider,
  getSearchProvider,
  __resetSearchProviderForTests,
} from "./provider";

const original = process.env.RAG_PROVIDER;

afterEach(() => {
  if (original === undefined) delete process.env.RAG_PROVIDER;
  else process.env.RAG_PROVIDER = original;
  __resetSearchProviderForTests();
});

describe("resolveRagProvider", () => {
  it("defaults to local and recognizes bedrock", () => {
    expect(resolveRagProvider(undefined)).toBe("local");
    expect(resolveRagProvider("local")).toBe("local");
    expect(resolveRagProvider("bedrock")).toBe("bedrock");
    expect(resolveRagProvider("BEDROCK")).toBe("bedrock");
    expect(resolveRagProvider("nonsense")).toBe("local");
  });
});

describe("getSearchProvider selection", () => {
  it("local mode returns the deterministic local provider (answers from the corpus)", async () => {
    process.env.RAG_PROVIDER = "local";
    __resetSearchProviderForTests();
    const res = await getSearchProvider().answer("How do I order a transcript?");
    expect(res.kind).toBe("answered");
  });

  it("bedrock mode never silently falls back to local (unconfigured => safe error)", async () => {
    process.env.RAG_PROVIDER = "bedrock";
    __resetSearchProviderForTests();
    const res = await getSearchProvider().answer("How do I order a transcript?");
    // In the test env bedrock is unconfigured, so the provider returns a safe error —
    // crucially NOT an answered local result.
    expect(res.kind).toBe("error");
  });
});
