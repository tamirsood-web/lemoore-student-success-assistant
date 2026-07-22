import { describe, it, expect } from "vitest";
import { searchAnswerService } from "./searchAnswerService";
import { isApprovedOfficialUrl } from "@/lib/validation";
import type { WebsiteSearchResponse } from "@/types";

async function answered(
  query: string,
): Promise<Extract<WebsiteSearchResponse, { kind: "answered" }>> {
  const res = await searchAnswerService.answer(query);
  expect(res.kind, `expected "${query}" to be answered, got ${res.kind}`).toBe(
    "answered",
  );
  if (res.kind !== "answered") throw new Error("unreachable");
  return res;
}

describe("SearchAnswerService — natural-language queries map to the correct official source", () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ["How do I order my official transcript?", "official-transcripts"],
    ["When can I register for classes?", "official-registration"],
    ["Where can I get tutoring?", "official-tutoring"],
    ["How do I contact financial aid?", "official-financial-aid"],
    ["How much does attendance cost?", "official-cost-of-attendance"],
    ["How do I apply for graduation?", "official-graduation"],
    ["Where is the academic calendar?", "official-academic-calendar"],
    ["I forgot my student portal password.", "official-student-portal"],
    ["What services are available for veterans?", "official-veterans"],
    ["How do I meet with a counselor?", "official-counseling"],
    ["What is dual enrollment?", "official-dual-enrollment"],
    ["Where can I find scholarships?", "official-scholarships"],
  ];

  it.each(cases)("%s → cites %s", async (query, expectedId) => {
    const res = await answered(query);
    const ids = res.citations.map((c) => c.id);
    expect(ids, `citations for "${query}": ${ids.join(", ")}`).toContain(
      expectedId,
    );
  });
});

describe("SearchAnswerService — grounding + citation invariants", () => {
  it("every answered response has at least one citation on an approved HTTPS domain", async () => {
    const res = await answered("How do I order my transcript?");
    expect(res.citations.length).toBeGreaterThanOrEqual(1);
    for (const c of res.citations) {
      expect(c.url && isApprovedOfficialUrl(c.url)).toBe(true);
      expect(c.excerpt.length).toBeGreaterThan(0);
      expect(c.id.length).toBeGreaterThan(0);
    }
  });

  it("the answer text ends with an inline citation marker", async () => {
    const res = await answered("How do I contact financial aid?");
    expect(res.answer).toMatch(/\[1\]$/);
  });

  it("keyword (non-question) queries also work", async () => {
    const res = await answered("transcript request");
    expect(res.citations.map((c) => c.id)).toContain("official-transcripts");
  });
});

describe("SearchAnswerService — honest non-answers", () => {
  it("returns unsupported for an off-topic question with no official source", async () => {
    const res = await searchAnswerService.answer(
      "Where can I buy tickets to a professional football game?",
    );
    expect(["unsupported", "clarification"]).toContain(res.kind);
    if (res.kind === "answered") throw new Error("should not answer off-topic");
  });

  it("blocks shared sensitive identifiers without echoing the value", async () => {
    const res = await searchAnswerService.answer(
      "my ssn is 123-45-6789 what is my aid",
    );
    expect(res.kind).toBe("unsupported");
    if (res.kind === "unsupported") {
      expect(res.message).not.toContain("123-45-6789");
      expect(res.relatedResults).toHaveLength(0);
    }
  });

  it("does NOT treat a password-reset question as sensitive", async () => {
    const res = await searchAnswerService.answer(
      "I forgot my student portal password.",
    );
    expect(res.kind).toBe("answered");
  });

  it("empty-ish query yields clarification, never a fabricated answer", async () => {
    const res = await searchAnswerService.answer("the a of");
    expect(res.kind).toBe("clarification");
  });
});
