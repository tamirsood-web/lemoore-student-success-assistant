import { describe, it, expect } from "vitest";
import { searchAnswerService } from "./searchAnswerService";

describe("Answer relevance — irrelevant content is excluded", () => {
  it("'When can I register for classes?' does not contain ZTC, LTC, or course numbering", async () => {
    const res = await searchAnswerService.answer("When can I register for classes?");
    // The answer must not include irrelevant content from the registration page.
    const answer = res.kind === "answered" ? res.answer : "";
    expect(answer).not.toContain("Zero Textbook Cost");
    expect(answer).not.toContain("Low Textbook Cost");
    expect(answer).not.toContain("$40");
    expect(answer).not.toContain("Common Course Numbering");
  });

  it("'How do I apply to Lemoore College?' does not contain graduation information", async () => {
    const res = await searchAnswerService.answer("How do I apply to Lemoore College?");
    expect(res.kind).toBe("answered");
    if (res.kind !== "answered") return;
    expect(res.answer).not.toContain("graduation");
    expect(res.answer).not.toContain("diploma");
    expect(res.answer).not.toContain("commencement");
  });

  it("'How do I apply to Lemoore College?' contains application steps", async () => {
    const res = await searchAnswerService.answer("How do I apply to Lemoore College?");
    expect(res.kind).toBe("answered");
    if (res.kind !== "answered") return;
    expect(res.answer).toContain("CCCApply");
    // Must have structured content (bullets or numbered steps).
    expect(res.answer).toMatch(/[•]|\d+\./);
  });
});

describe("Answer structure — formatting contract enforcement", () => {
  it("multi-step answers use bullet or numbered list formatting", async () => {
    const res = await searchAnswerService.answer("How do I apply to Lemoore College?");
    expect(res.kind).toBe("answered");
    if (res.kind !== "answered") return;

    // Must contain newlines (not a single wall of text).
    expect(res.answer).toContain("\n");

    // Must have list markers (• or N.).
    const hasBullets = res.answer.includes("•");
    const hasNumbers = /\d+\.\s/.test(res.answer);
    expect(hasBullets || hasNumbers).toBe(true);
  });

  it("contact answers present details separately from the main list", async () => {
    const res = await searchAnswerService.answer("How can I contact financial aid?");
    expect(res.kind).toBe("answered");
    if (res.kind !== "answered") return;

    // Contact info (phone/email) must appear as standalone lines, not inside bullet items.
    const lines = res.answer.split("\n");
    const hasContactLine = lines.some(
      (l) =>
        !l.startsWith("•") &&
        (/Phone/.test(l) || /Email/.test(l) || /\(\d{3}\)/.test(l) || /[\w.-]+@[\w.-]+/.test(l)),
    );
    expect(hasContactLine).toBe(true);
  });

  it("answers do not exceed 2 sentences before a list or break", async () => {
    const res = await searchAnswerService.answer("Where can I get tutoring?");
    expect(res.kind).toBe("answered");
    if (res.kind !== "answered") return;

    // Split into blocks by \n\n. The first block (direct answer) should be ≤ 2 sentences.
    const blocks = res.answer.split("\n\n");
    const firstBlock = blocks[0] ?? "";
    // Only count sentences in non-list blocks.
    if (!firstBlock.startsWith("•") && !/^\d+\./.test(firstBlock)) {
      const sentences = firstBlock.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
      expect(sentences.length).toBeLessThanOrEqual(2);
    }
  });
});
