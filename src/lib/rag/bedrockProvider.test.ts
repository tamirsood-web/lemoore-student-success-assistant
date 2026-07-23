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
  // Existing behavior tests exercise the single-call (unfiltered) diagnostic path.
  strategy: "combined",
  dataSourceIds: {},
};
const OK: BedrockConfigResult = { status: "ok", config: CONFIG };

const S3_ID = "S3SOURCE01";
const CRAWLER_ID = "CRAWLERID9";
const s3FirstConfig = (
  over: Partial<BedrockConfig> = {},
): { status: "ok"; config: BedrockConfig } => ({
  status: "ok",
  config: { ...CONFIG, strategy: "s3-first", dataSourceIds: { s3: S3_ID, crawler: CRAWLER_ID }, ...over },
});

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
    expect(runRag).toHaveBeenCalledWith(CONFIG, "How do I order a transcript?", undefined);
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

const CRAWLER_OUTPUT: BedrockRagOutput = {
  output: { text: "Contact financial aid at the Financial Aid Office." },
  citations: [
    {
      retrievedReferences: [
        {
          content: { text: "The Financial Aid Office can be reached during business hours." },
          metadata: {
            page_title: "Financial Aid | Lemoore College",
            source_url: "https://lemoorecollege.edu/admissions/financial-aid/",
          },
          location: { webLocation: { url: "https://lemoorecollege.edu/admissions/financial-aid/" } },
        },
      ],
    },
  ],
};
// Non-empty answer text but NO usable evidence (empty excerpt) → normalizes to "unsupported".
const NO_EVIDENCE_OUTPUT: BedrockRagOutput = {
  output: { text: "Here is some text." },
  citations: [{ retrievedReferences: [{ content: { text: "" }, metadata: {}, location: {} }] }],
};
const EMPTY_OUTPUT: BedrockRagOutput = { output: { text: "hi" }, citations: [] };
const throttling = Object.assign(new Error("slow down"), { name: "ThrottlingException" });
const accessDenied = Object.assign(new Error("no"), { name: "AccessDeniedException" });

describe("createBedrockSearchService — s3-first production strategy", () => {
  it("queries S3 FIRST and does not call the crawler when S3 evidence is sufficient", async () => {
    const cfg = s3FirstConfig();
    const runRag = vi
      .fn<RunRagFn>()
      .mockImplementation(async (_c, _t, id) => (id === S3_ID ? GOOD_OUTPUT : CRAWLER_OUTPUT));
    const res = await createBedrockSearchService(cfg, { runRag }).answer("How do I order a transcript?");
    expect(runRag).toHaveBeenCalledTimes(1);
    expect(runRag).toHaveBeenCalledWith(cfg.config, "How do I order a transcript?", S3_ID);
    expect(res.kind).toBe("answered");
    if (res.kind === "answered") {
      expect(res.citations[0]?.url).toBe("https://lemoorecollege.edu/resources/transcripts.php");
    }
  });

  it("falls back to the crawler when S3 returns unsupported (no references)", async () => {
    const cfg = s3FirstConfig();
    const runRag = vi
      .fn<RunRagFn>()
      .mockImplementation(async (_c, _t, id) => (id === S3_ID ? EMPTY_OUTPUT : CRAWLER_OUTPUT));
    const res = await createBedrockSearchService(cfg, { runRag }).answer("How do I contact financial aid?");
    expect(runRag).toHaveBeenNthCalledWith(1, cfg.config, "How do I contact financial aid?", S3_ID);
    expect(runRag).toHaveBeenNthCalledWith(2, cfg.config, "How do I contact financial aid?", CRAWLER_ID);
    expect(res.kind).toBe("answered");
    if (res.kind === "answered") {
      expect(res.citations[0]?.url).toBe("https://lemoorecollege.edu/admissions/financial-aid/");
    }
  });

  it("falls back to the crawler when the S3 result lacks usable citations", async () => {
    const cfg = s3FirstConfig();
    const runRag = vi
      .fn<RunRagFn>()
      .mockImplementation(async (_c, _t, id) => (id === S3_ID ? NO_EVIDENCE_OUTPUT : CRAWLER_OUTPUT));
    const res = await createBedrockSearchService(cfg, { runRag }).answer("q");
    expect(runRag).toHaveBeenCalledTimes(2);
    expect(res.kind).toBe("answered");
  });

  it("returns unsupported (not error) when BOTH S3 and crawler are weak", async () => {
    const cfg = s3FirstConfig();
    const runRag = vi.fn<RunRagFn>().mockResolvedValue(EMPTY_OUTPUT);
    const res = await createBedrockSearchService(cfg, { runRag }).answer("obscure unrelated question");
    expect(runRag).toHaveBeenCalledTimes(2);
    expect(res.kind).toBe("unsupported");
  });

  it("attempts the crawler after a TRANSIENT S3 error and returns the crawler answer", async () => {
    const cfg = s3FirstConfig();
    const runRag = vi
      .fn<RunRagFn>()
      .mockImplementation(async (_c, _t, id) => {
        if (id === S3_ID) throw throttling;
        return CRAWLER_OUTPUT;
      });
    const res = await createBedrockSearchService(cfg, { runRag }).answer("q");
    expect(runRag).toHaveBeenCalledTimes(2);
    expect(res.kind).toBe("answered");
  });

  it("does NOT mask a NON-transient S3 error with the crawler (returns safe error, no crawler call)", async () => {
    const cfg = s3FirstConfig();
    const runRag = vi.fn<RunRagFn>().mockRejectedValue(accessDenied);
    const res = await createBedrockSearchService(cfg, { runRag }).answer("q");
    expect(runRag).toHaveBeenCalledTimes(1);
    expect(runRag).toHaveBeenCalledWith(cfg.config, "q", S3_ID);
    expect(res.kind).toBe("error");
    if (res.kind === "error") {
      expect(res.message).toBe(SERVICE_UNAVAILABLE_MESSAGE);
      expect(res.message).not.toContain("Exception");
    }
  });

  it("returns a safe error when S3 errors transiently and the crawler also errors", async () => {
    const cfg = s3FirstConfig();
    const runRag = vi
      .fn<RunRagFn>()
      .mockImplementation(async (_c, _t, id) => {
        if (id === S3_ID) throw throttling;
        throw Object.assign(new Error("net"), { code: "ECONNRESET" });
      });
    const res = await createBedrockSearchService(cfg, { runRag }).answer("q");
    expect(runRag).toHaveBeenCalledTimes(2);
    expect(res.kind).toBe("error");
  });

  it("skips the crawler when no crawler id is configured and returns S3's unsupported", async () => {
    const cfg = s3FirstConfig({ dataSourceIds: { s3: S3_ID } });
    const runRag = vi.fn<RunRagFn>().mockResolvedValue(EMPTY_OUTPUT);
    const res = await createBedrockSearchService(cfg, { runRag }).answer("q");
    expect(runRag).toHaveBeenCalledTimes(1);
    expect(runRag).toHaveBeenCalledWith(cfg.config, "q", S3_ID);
    expect(res.kind).toBe("unsupported");
  });

  it("degrades to unfiltered retrieval when s3-first is set but no S3 id is configured", async () => {
    const cfg = s3FirstConfig({ dataSourceIds: {} });
    const runRag = vi.fn<RunRagFn>().mockResolvedValue(GOOD_OUTPUT);
    const res = await createBedrockSearchService(cfg, { runRag }).answer("q");
    expect(runRag).toHaveBeenCalledTimes(1);
    expect(runRag).toHaveBeenCalledWith(cfg.config, "q", undefined);
    expect(res.kind).toBe("answered");
  });
});

describe("data-source id privacy in responses", () => {
  it("never includes either data-source id in the returned response (answered or unsupported)", async () => {
    const cfg = s3FirstConfig();
    for (const output of [GOOD_OUTPUT, EMPTY_OUTPUT]) {
      const runRag = vi.fn<RunRagFn>().mockResolvedValue(output);
      const res = await createBedrockSearchService(cfg, { runRag }).answer("q");
      const serialized = JSON.stringify(res);
      expect(serialized).not.toContain(S3_ID);
      expect(serialized).not.toContain(CRAWLER_ID);
    }
  });
});

describe("createBedrockSearchService — diagnostic strategies still work", () => {
  it("strategy=combined sends NO data-source filter", async () => {
    const cfg = s3FirstConfig({ strategy: "combined", dataSourceIds: { s3: S3_ID, crawler: CRAWLER_ID } });
    const runRag = vi.fn<RunRagFn>().mockResolvedValue(GOOD_OUTPUT);
    await createBedrockSearchService(cfg, { runRag }).answer("q");
    expect(runRag).toHaveBeenCalledTimes(1);
    expect(runRag).toHaveBeenCalledWith(cfg.config, "q", undefined);
  });

  it("strategy=s3 filters on the S3 id only (no fallback)", async () => {
    const cfg = s3FirstConfig({ strategy: "s3" });
    const runRag = vi.fn<RunRagFn>().mockResolvedValue(EMPTY_OUTPUT);
    const res = await createBedrockSearchService(cfg, { runRag }).answer("q");
    expect(runRag).toHaveBeenCalledTimes(1);
    expect(runRag).toHaveBeenCalledWith(cfg.config, "q", S3_ID);
    expect(res.kind).toBe("unsupported");
  });

  it("strategy=crawler filters on the crawler id only", async () => {
    const cfg = s3FirstConfig({ strategy: "crawler" });
    const runRag = vi.fn<RunRagFn>().mockResolvedValue(CRAWLER_OUTPUT);
    await createBedrockSearchService(cfg, { runRag }).answer("q");
    expect(runRag).toHaveBeenCalledTimes(1);
    expect(runRag).toHaveBeenCalledWith(cfg.config, "q", CRAWLER_ID);
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
