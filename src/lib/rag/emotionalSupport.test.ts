import { describe, it, expect } from "vitest";
import { classifyIntent } from "./intentClassifier";
import { searchAnswerService } from "./searchAnswerService";

describe("Intent classification — emotional support vs academic support", () => {
  // --- Emotional support: must NOT route to academic tutoring ---
  const EMOTIONAL_QUERIES = [
    "I need emotional support.",
    "I feel overwhelmed.",
    "I'm stressed.",
    "I need someone to talk to.",
    "I'm having a difficult time.",
    "I feel anxious about school.",
    "Where can I get mental-health support?",
    "Does Lemoore College offer mental-health counseling?",
    "I need help with my mental health.",
  ];

  it.each(EMOTIONAL_QUERIES)(
    "%s is classified as emotional_support",
    (query) => {
      const result = classifyIntent(query);
      expect(result.intent).toBe("emotional_support");
    },
  );

  // --- Academic support: must continue using tutoring resources ---
  const ACADEMIC_QUERIES = [
    "I need help with math.",
    "I need tutoring.",
    "I need help with an assignment.",
    "Where can I get writing support?",
    "I need help understanding my classwork.",
  ];

  it.each(ACADEMIC_QUERIES)(
    "%s is classified as college_question (not emotional_support)",
    (query) => {
      const result = classifyIntent(query);
      expect(result.intent).toBe("college_question");
    },
  );

  // --- Ambiguous support: must ask for clarification ---
  it("'I need support.' triggers ambiguous_support clarification", () => {
    const result = classifyIntent("I need support.");
    expect(result.intent).toBe("ambiguous_support");
    expect(result.requiresRetrieval).toBe(false);
    expect(result.response).toContain("Academic support");
    expect(result.response).toContain("Emotional");
  });

  it("'I need help.' triggers ambiguous_support clarification", () => {
    const result = classifyIntent("I need help.");
    expect(result.intent).toBe("ambiguous_support");
  });

  // --- Ambiguous counseling: standalone "counseling" without qualifiers ---
  it("'I need counseling.' triggers ambiguous_support (not emotional_support)", () => {
    const result = classifyIntent("I need counseling.");
    expect(result.intent).toBe("ambiguous_support");
    expect(result.requiresRetrieval).toBe(false);
    expect(result.response).toContain("academic counseling");
  });

  it("'Does the college offer counseling?' triggers ambiguous_support", () => {
    const result = classifyIntent("Does the college offer counseling?");
    expect(result.intent).toBe("ambiguous_support");
  });

  it("'Can I speak to a counselor?' routes to college_question (specific action)", () => {
    const result = classifyIntent("Can I speak to a counselor?");
    // "speak to" is a specific action, not ambiguous — routes through normal retrieval.
    expect(result.requiresRetrieval).toBe(true);
  });
});

describe("Intent classification — urgent safety", () => {
  const URGENT_QUERIES = [
    "I want to hurt myself.",
    "I don't want to live.",
    "I'm having a mental-health emergency.",
  ];

  it.each(URGENT_QUERIES)(
    "%s is classified as urgent_safety",
    (query) => {
      const result = classifyIntent(query);
      expect(result.intent).toBe("urgent_safety");
      expect(result.requiresRetrieval).toBe(false);
      expect(result.response).toContain("988");
      expect(result.response).toContain("911");
    },
  );
});

describe("Answer content — emotional support never shows ACE tutoring", () => {
  it("'I need emotional support.' does not mention ACE or tutoring", async () => {
    const res = await searchAnswerService.answer("I need emotional support.");
    const text = res.kind === "answered" ? res.answer : "message" in res ? (res as any).message : "";
    expect(text).not.toContain("Academic Center for Excellence");
    expect(text).not.toContain("ACE");
    expect(text).not.toContain("tutoring");
    expect(text).not.toContain("math");
    expect(text).not.toContain("writing");
    expect(text).not.toContain("reading comprehension");
  });

  it("'I feel overwhelmed.' does not mention ACE or tutoring", async () => {
    const res = await searchAnswerService.answer("I feel overwhelmed.");
    const text = res.kind === "answered" ? res.answer : "message" in res ? (res as any).message : "";
    expect(text).not.toContain("Academic Center for Excellence");
    expect(text).not.toContain("ACE");
    expect(text).not.toContain("tutoring");
  });

  it("'Where can I get mental-health support?' does not cite official-tutoring", async () => {
    const res = await searchAnswerService.answer("Where can I get mental-health support?");
    if (res.kind === "answered") {
      const citationIds = res.citations.map((c) => c.id);
      expect(citationIds).not.toContain("official-tutoring");
    }
  });
});

describe("Answer content — academic tutoring still uses ACE", () => {
  it("'I need help with math.' cites official-tutoring", async () => {
    const res = await searchAnswerService.answer("I need help with math.");
    expect(res.kind).toBe("answered");
    if (res.kind === "answered") {
      expect(res.citations.map((c) => c.id)).toContain("official-tutoring");
      expect(res.answer).toContain("Academic Center for Excellence");
    }
  });

  it("'I need tutoring.' cites official-tutoring", async () => {
    const res = await searchAnswerService.answer("I need tutoring.");
    expect(res.kind).toBe("answered");
    if (res.kind === "answered") {
      expect(res.citations.map((c) => c.id)).toContain("official-tutoring");
    }
  });
});

describe("Answer content — counseling retrieval works for qualified queries", () => {
  it("'I need academic counseling for my degree.' finds the counseling page", async () => {
    const res = await searchAnswerService.answer("I need academic counseling for my degree.");
    expect(res.kind).toBe("answered");
    if (res.kind === "answered") {
      expect(res.citations.map((c) => c.id)).toContain("official-counseling");
    }
  });
});

describe("Strict source validation — academic counseling rejected for emotional queries", () => {
  it("'I need emotional support.' does not show academic counseling content", async () => {
    const res = await searchAnswerService.answer("I need emotional support.");
    const text = res.kind === "answered" ? res.answer : "message" in res ? (res as any).message : "";
    // Must not contain academic counseling topics.
    expect(text).not.toContain("educational planning");
    expect(text).not.toContain("course selection");
    expect(text).not.toContain("degree requirements");
    expect(text).not.toContain("transfer planning");
    expect(text).not.toContain("Career Services");
    expect(text).not.toContain("probation");
    expect(text).not.toContain("academic major");
  });

  it("'I need emotional support.' does not cite official-counseling (academic page)", async () => {
    const res = await searchAnswerService.answer("I need emotional support.");
    if (res.kind === "answered") {
      expect(res.citations.map((c) => c.id)).not.toContain("official-counseling");
    }
  });

  it("'Where can I get mental-health support?' does not cite academic-only pages", async () => {
    const res = await searchAnswerService.answer("Where can I get mental-health support?");
    if (res.kind === "answered") {
      expect(res.citations.map((c) => c.id)).not.toContain("official-tutoring");
      expect(res.citations.map((c) => c.id)).not.toContain("official-counseling");
    }
  });
});
