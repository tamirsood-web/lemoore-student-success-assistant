import { describe, it, expect, vi } from "vitest";
import { createBedrockSearchService, type RunRagFn } from "./bedrockProvider";
import { classifyError, SERVICE_UNAVAILABLE_MESSAGE } from "./bedrockErrors";
import type { BedrockConfig, BedrockConfigResult } from "./bedrockConfig";
import type { BedrockRagOutput } from "./bedrockNormalize";

const CONFIG: BedrockConfig = {
  region: "us-west-2",
  knowledgeBaseId: "ABCDEF1234",
  modelArn: "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
  numberOfResults: 8,
  timeoutMs: 15000,
};
const OK: BedrockConfigResult = { status: "ok", config: CONFIG };

const GOOD_OUTPUT: BedrockRagOutput = {
  output: { text: "You can order transcripts through Parchment." },
  citations: [
    {
      retrievedReferences: [
        {
          content: { text: "Standard transcript requests are $7.38 per transcript." },
          metadata: {
            page_title: "Transcripts | Lemoore College",
            source_url: "https://lemoorecollege.edu/resources/transcripts.php",
            department: "Admissions and Records",
          },
          location: { webLocation: { url: "https://lemoorecollege.edu/resources/transcripts.php" } },
        },
      ],
    },
  ],
};

describe("createBedrockSearchService — configuration gating (no silent local fallback)", () => {
  it("returns a safe error and never calls Bedrock when config is invalid", async () => {
    const runRag = vi.fn<RunRagFn>();
    const svc = createBedrockSearchService({ status: "invalid", detail: "missing region" }, { runRag });
    const res = await svc.answer("How do I order a transcript?");
    expect(res.kind).toBe("error");
    if (res.kind === "error") expect(res.message).toBe(SERVICE_UNAVAILABLE_MESSAGE);
    expect(runRag).not.toHaveBeenCalled();
  });

  it("refuses managed KB safely without calling RetrieveAndGenerate", async () => {
    const runRag = vi.fn<RunRagFn>();
    const svc = createBedrockSearchService({ status: "managed", detail: "managed kb" }, { runRag });
    const res = await svc.answer("anything");
    expect(res.kind).toBe("error");
    expect(runRag).not.toHaveBeenCalled();
  });
});

describe("createBedrockSearchService — live pipeline (mocked call)", () => {
  it("passes the normalized query to Bedrock and returns an answered response with citations", async () => {
    const runRag = vi.fn<RunRagFn>().mockResolvedValue(GOOD_OUTPUT);
    const svc = createBedrockSearchService(OK, { runRag });
    const res = await svc.answer("  How do I order a transcript?  ");
    expect(runRag).toHaveBeenCalledWith(CONFIG, "How do I order a transcript?");
    expect(res.kind).toBe("answered");
    if (res.kind !== "answered") return;
    expect(res.citations[0]?.url).toBe("https://lemoorecollege.edu/resources/transcripts.php");
  });

  it("screens shared PII before calling Bedrock", async () => {
    const runRag = vi.fn<RunRagFn>();
    const svc = createBedrockSearchService(OK, { runRag });
    const res = await svc.answer("my ssn is 123-45-6789");
    expect(res.kind).toBe("unsupported");
    if (res.kind === "unsupported") expect(res.message).not.toContain("123-45-6789");
    expect(runRag).not.toHaveBeenCalled();
  });

  it("returns unsupported (not answered) when Bedrock returns no references", async () => {
    const runRag = vi.fn<RunRagFn>().mockResolvedValue({ output: { text: "hi" }, citations: [] });
    const svc = createBedrockSearchService(OK, { runRag });
    const res = await svc.answer("q");
    expect(res.kind).toBe("unsupported");
  });
});

describe("createBedrockSearchService — AWS failures map to safe public responses", () => {
  const failures: ReadonlyArray<readonly [string, Error]> = [
    ["AccessDeniedException", Object.assign(new Error("x"), { name: "AccessDeniedException" })],
    ["ResourceNotFoundException", Object.assign(new Error("x"), { name: "ResourceNotFoundException" })],
    ["ThrottlingException", Object.assign(new Error("x"), { name: "ThrottlingException" })],
    ["ServiceQuotaExceededException", Object.assign(new Error("x"), { name: "ServiceQuotaExceededException" })],
    ["TimeoutError", Object.assign(new Error("timed out"), { name: "TimeoutError" })],
    ["network", Object.assign(new Error("net"), { code: "ECONNRESET" })],
  ];

  it.each(failures)("maps %s to a safe service-unavailable response", async (_label, err) => {
    const runRag = vi.fn<RunRagFn>().mockRejectedValue(err);
    const svc = createBedrockSearchService(OK, { runRag });
    const res = await svc.answer("q");
    expect(res.kind).toBe("error");
    if (res.kind === "error") {
      expect(res.message).toBe(SERVICE_UNAVAILABLE_MESSAGE);
      // Public message must not leak the AWS exception name.
      expect(res.message).not.toContain("Exception");
    }
  });
});

describe("classifyError", () => {
  it("classifies known AWS exception names", () => {
    expect(classifyError({ name: "AccessDeniedException" })).toBe("access_denied");
    expect(classifyError({ name: "ThrottlingException" })).toBe("throttling");
    expect(classifyError({ name: "ValidationException" })).toBe("validation");
    expect(classifyError({ name: "ServiceQuotaExceededException" })).toBe("quota_exceeded");
    expect(classifyError({ name: "AbortError" })).toBe("timeout");
    expect(classifyError({ code: "ENOTFOUND" })).toBe("network");
    expect(classifyError(new Error("something else"))).toBe("internal");
  });
});
