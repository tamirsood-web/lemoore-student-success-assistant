import type { GuardrailVerdict } from "@/types";
import { getSourceById } from "@/lib/mock";
import { retrieve, COURSE_DATE_SOURCE_ID } from "./retrieve";
import { composeAnswer } from "./prompt";
import { applyEscalationRules } from "./escalation";
import { toAssistantResponse } from "./normalize";
import { screen } from "./guardrail";

const OK: GuardrailVerdict = { ok: true };

describe("toAssistantResponse — grounded", () => {
  it("returns a grounded response whose citations all map to real sources", async () => {
    const query = "What are the admissions office hours?";
    const result = await retrieve(query);
    const composedAnswer = composeAnswer(result);
    const escalation = applyEscalationRules({ result, composedAnswer, query });

    const response = toAssistantResponse({
      guardrail: OK,
      result,
      composedAnswer,
      escalation,
      suggestedQuestions: ["How do I contact counseling?"],
    });

    expect(response.kind).toBe("grounded");
    expect(response.escalationRecommended).toBe(false);
    expect(response.answer).toBe(composedAnswer);
    expect(response.citations.length).toBeGreaterThan(0);
    for (const citation of response.citations) {
      expect(getSourceById(citation.sourceId)).toBeDefined();
    }
    expect(response.suggestedQuestions).toEqual(["How do I contact counseling?"]);
  });

  it("maps a course-date match to the dataset source citation", async () => {
    const query = "What is the drop date for MATH 101 section 01 in Fall 2025?";
    const result = await retrieve(query);
    const composedAnswer = composeAnswer(result);
    const escalation = applyEscalationRules({ result, composedAnswer, query });

    const response = toAssistantResponse({
      guardrail: OK,
      result,
      composedAnswer,
      escalation,
    });

    expect(response.kind).toBe("grounded");
    expect(response.citations[0]?.sourceId).toBe(COURSE_DATE_SOURCE_ID);
  });
});

describe("toAssistantResponse — insufficient evidence", () => {
  it("escalates transparently when nothing is retrieved", async () => {
    const query = "Tell me about quantum tea dragons please";
    const result = await retrieve(query);
    const composedAnswer = composeAnswer(result);
    const escalation = applyEscalationRules({ result, composedAnswer, query });

    const response = toAssistantResponse({
      guardrail: OK,
      result,
      composedAnswer,
      escalation,
    });

    expect(response.kind).toBe("insufficient_evidence");
    expect(response.escalationRecommended).toBe(true);
    if (response.kind === "insufficient_evidence") {
      expect(response.escalation.contact.name.length).toBeGreaterThan(0);
      expect(response.answer.toLowerCase()).toContain("could not verify");
    }
    expect(response.citations).toHaveLength(0);
  });
});

describe("toAssistantResponse — safe rejection", () => {
  it("rejects sensitive input without echoing the value", () => {
    const ssn = "123-45-6789";
    const guardrail = screen(`My SSN is ${ssn}`);
    const result = { intent: "source" as const, snippets: [] };
    const escalation = applyEscalationRules({ result, composedAnswer: null });

    const response = toAssistantResponse({
      guardrail,
      result,
      composedAnswer: null,
      escalation,
    });

    expect(response.kind).toBe("safe_rejection");
    if (response.kind === "safe_rejection") {
      expect(response.rejection.category).toBe("ssn");
      expect(response.answer).not.toContain(ssn);
      expect(response.rejection.message).not.toContain(ssn);
    }
    expect(response.citations).toHaveLength(0);
  });
});
