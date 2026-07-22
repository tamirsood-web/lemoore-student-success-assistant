import { describe, it, expect } from "vitest";
import { normalizeBedrockResponse, type BedrockRagOutput } from "./bedrockNormalize";

function ref(over: Record<string, unknown> = {}) {
  return {
    content: { text: "Students receive two free transcript requests in their lifetime." },
    metadata: {
      page_title: "Transcripts | Lemoore College",
      source_url: "https://lemoorecollege.edu/resources/transcripts.php",
      department: "Admissions and Records",
    },
    location: { type: "WEB", webLocation: { url: "https://lemoorecollege.edu/resources/transcripts.php" } },
    ...over,
  };
}

function output(refs: unknown[], text = "You can order transcripts through Parchment.", extra: Partial<BedrockRagOutput> = {}): BedrockRagOutput {
  return { output: { text }, citations: [{ retrievedReferences: refs as never }], ...extra };
}

describe("normalizeBedrockResponse — happy path", () => {
  it("maps output text + a retrieved reference into an answered response with a citation", () => {
    const res = normalizeBedrockResponse("How do I order a transcript?", output([ref()]));
    expect(res.kind).toBe("answered");
    if (res.kind !== "answered") return;
    expect(res.answer).toContain("Parchment");
    expect(res.citations).toHaveLength(1);
    expect(res.citations[0]?.title).toBe("Transcripts | Lemoore College");
    expect(res.citations[0]?.url).toBe("https://lemoorecollege.edu/resources/transcripts.php");
    expect(res.citations[0]?.department).toBe("Admissions and Records");
    expect(res.citations[0]?.excerpt.length).toBeGreaterThan(0);
  });

  it("prefers canonical_url metadata over source_url", () => {
    const res = normalizeBedrockResponse(
      "q",
      output([ref({ metadata: { page_title: "T", canonical_url: "https://www.lemoorecollege.edu/canonical", source_url: "https://lemoorecollege.edu/other" } })]),
    );
    if (res.kind !== "answered") throw new Error("expected answered");
    expect(res.citations[0]?.url).toBe("https://www.lemoorecollege.edu/canonical");
  });
});

describe("normalizeBedrockResponse — citations come only from references + dedup", () => {
  it("deduplicates references that share a canonical URL", () => {
    const res = normalizeBedrockResponse("q", output([ref(), ref()]));
    if (res.kind !== "answered") throw new Error("expected answered");
    expect(res.citations).toHaveLength(1);
  });

  it("returns unsupported when there is text but no references", () => {
    const res = normalizeBedrockResponse("q", { output: { text: "some text" }, citations: [] });
    expect(res.kind).toBe("unsupported");
  });

  it("returns unsupported when references have no usable excerpt", () => {
    const res = normalizeBedrockResponse("q", output([{ content: { text: "" }, metadata: {} }]));
    expect(res.kind).toBe("unsupported");
  });

  it("returns unsupported when generated text is empty", () => {
    const res = normalizeBedrockResponse("q", output([ref()], ""));
    expect(res.kind).toBe("unsupported");
  });

  it("does not produce answered when a guardrail intervened", () => {
    const res = normalizeBedrockResponse("q", output([ref()], "text", { guardrailAction: "INTERVENED" }));
    expect(res.kind).not.toBe("answered");
  });
});

describe("normalizeBedrockResponse — URL hygiene (never expose internal locators)", () => {
  const cases: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
    ["unofficial domain", { metadata: { page_title: "X", source_url: "https://evil.com/x" }, location: null }],
    ["http (not https)", { metadata: { page_title: "X", source_url: "http://lemoorecollege.edu/x" }, location: null }],
    ["malformed url", { metadata: { page_title: "X", source_url: "not a url" }, location: null }],
    ["s3 uri", { metadata: { page_title: "X", source_url: "s3://my-bucket/doc.pdf" }, location: { s3Location: { uri: "s3://my-bucket/doc.pdf" } } }],
    ["arn", { metadata: { page_title: "X", source_url: "arn:aws:s3:::my-bucket/doc" }, location: null }],
    ["console url", { metadata: { page_title: "X", source_url: "https://console.aws.amazon.com/s3" }, location: null }],
  ];

  it.each(cases)("drops the public URL for a %s but keeps the document", (_label, over) => {
    const res = normalizeBedrockResponse("q", output([ref(over)]));
    if (res.kind !== "answered") throw new Error("expected answered");
    const c = res.citations[0];
    expect(c?.url).toBeUndefined();
    expect(c?.title).toBeTruthy();
    expect(c?.excerpt.length).toBeGreaterThan(0);
    // The public id must never be an S3 URI / ARN / bucket name.
    expect(c?.id).not.toMatch(/s3:|arn:|amazonaws\.com|my-bucket/i);
  });

  it("uses an approved webLocation URL only when metadata lacks one", () => {
    const res = normalizeBedrockResponse(
      "q",
      output([{ content: { text: "hello world" }, metadata: { page_title: "T" }, location: { webLocation: { url: "https://lemoorecollege.edu/web" } } }]),
    );
    if (res.kind !== "answered") throw new Error("expected answered");
    expect(res.citations[0]?.url).toBe("https://lemoorecollege.edu/web");
  });

  it("never exposes an S3 location, ARN, or account id anywhere in the response", () => {
    const res = normalizeBedrockResponse(
      "q",
      output([{ content: { text: "hi" }, metadata: { page_title: "T", "x-account": "123456789012" }, location: { s3Location: { uri: "s3://secret-bucket/doc.pdf" } } }]),
    );
    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain("s3://");
    expect(serialized).not.toContain("secret-bucket");
    expect(serialized).not.toContain("arn:");
    expect(serialized).not.toContain("123456789012");
  });
});
