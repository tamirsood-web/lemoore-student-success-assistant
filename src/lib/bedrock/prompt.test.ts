import { composeAnswer } from "./prompt";
import { retrieve } from "./retrieve";

/** Split answer into sentences for grounding verification. */
function answerSentences(text: string): string[] {
  return text
    .split(/\n/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((s) => s.replace(/^\d+\.\s+/, "").replace(/^[•\-]\s+/, "").trim())
    .filter((s) => s.length > 0);
}

/** Normalize whitespace for substring matching. */
function norm(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

describe("composeAnswer", () => {
  it("composes an answer grounded only in snippet excerpts", async () => {
    const result = await retrieve("How can I contact financial aid?");
    const answer = composeAnswer(result);
    expect(answer).not.toBeNull();

    // Every sentence in the answer must appear verbatim in at least one source excerpt.
    const combinedSource = result.snippets.map((s) => norm(s.excerpt)).join(" ");
    for (const sentence of answerSentences(answer!)) {
      expect(combinedSource).toContain(norm(sentence));
    }
  });

  it("returns null when there are no supporting snippets", async () => {
    const result = await retrieve("Tell me about quantum tea dragons please");
    expect(composeAnswer(result)).toBeNull();
  });

  it("contains no factual content beyond the source excerpts", async () => {
    const result = await retrieve("What are the admissions office hours?");
    const answer = composeAnswer(result) ?? "";
    // Every sentence in the answer traces back to a snippet excerpt.
    const combinedSource = result.snippets.map((s) => norm(s.excerpt)).join(" ");
    for (const sentence of answerSentences(answer)) {
      expect(combinedSource).toContain(norm(sentence));
    }
  });
});
