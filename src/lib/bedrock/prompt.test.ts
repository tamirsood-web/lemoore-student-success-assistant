import { composeAnswer, ANSWER_SEPARATOR } from "./prompt";
import { retrieve } from "./retrieve";

describe("composeAnswer", () => {
  it("composes an answer only from snippet excerpts", async () => {
    const result = await retrieve("How can I contact financial aid?");
    const answer = composeAnswer(result);
    expect(answer).not.toBeNull();

    const expected = result.snippets
      .map((snippet) => snippet.excerpt)
      .join(ANSWER_SEPARATOR);
    // The answer is EXACTLY the concatenation of snippet excerpts — no invented text.
    expect(answer).toBe(expected);
    for (const snippet of result.snippets) {
      expect(answer).toContain(snippet.excerpt);
    }
  });

  it("returns null when there are no supporting snippets", async () => {
    const result = await retrieve("Tell me about quantum tea dragons please");
    expect(composeAnswer(result)).toBeNull();
  });

  it("contains no characters beyond the joined snippet excerpts", async () => {
    const result = await retrieve("What are the admissions office hours?");
    const answer = composeAnswer(result) ?? "";
    const totalExcerptLength = result.snippets.reduce(
      (sum, snippet) => sum + snippet.excerpt.length,
      0,
    );
    const separatorLength =
      Math.max(0, result.snippets.length - 1) * ANSWER_SEPARATOR.length;
    expect(answer.length).toBe(totalExcerptLength + separatorLength);
  });
});
