import { redact, redactQuestion } from "./redact";

describe("redactQuestion", () => {
  it("masks a Social Security number", () => {
    const out = redactQuestion("My SSN is 123-45-6789 thanks");
    expect(out).not.toContain("123-45-6789");
  });

  it("masks emails and long digit runs", () => {
    const out = redactQuestion("email me at student@demo.example or call 5551234567");
    expect(out).not.toContain("student@demo.example");
    expect(out).not.toContain("5551234567");
  });

  it("truncates very long input", () => {
    const out = redactQuestion("word ".repeat(200));
    expect(out.length).toBeLessThanOrEqual(121);
  });
});

describe("redact", () => {
  it("produces a minimized record without the raw prompt", () => {
    const record = redact({
      question: "My SSN is 123-45-6789",
      confidence: "low",
      escalationRecommended: true,
      latencyMs: 42,
    });
    expect(record.mode).toBe("public");
    expect(record.confidence).toBe("low");
    expect(record.escalationRecommended).toBe(true);
    expect(record.latencyMs).toBe(42);
    expect(record.redactedQuestion).not.toContain("123-45-6789");
  });

  it("preserves an explicit mode and category", () => {
    const record = redact({
      question: "hello",
      confidence: "high",
      escalationRecommended: false,
      latencyMs: 1,
      mode: "ambassador",
      category: "financial_aid",
    });
    expect(record.mode).toBe("ambassador");
    expect(record.category).toBe("financial_aid");
  });

  it("is deterministic", () => {
    const input = {
      question: "My SSN is 123-45-6789",
      confidence: "low" as const,
      escalationRecommended: true,
      latencyMs: 42,
    };
    expect(redact(input)).toEqual(redact(input));
  });
});
