import { describe, it, expect } from "vitest";
import {
  formatDuration,
  stripCitationMarkers,
  isEscalationResponse,
  spokenTextFor,
  buildSummary,
  GREETING,
  type TranscriptEntry,
} from "./voiceState";
import type { WebsiteSearchResponse } from "@/types";

const answered: WebsiteSearchResponse = {
  kind: "answered",
  query: "transcripts",
  answer: "You can order transcripts online [1].",
  citations: [
    {
      id: "src:transcripts",
      title: "Transcripts | Lemoore College",
      excerpt: "Order via Parchment.",
      url: "https://lemoorecollege.edu/resources/transcripts.php",
    },
  ],
  relatedResults: [],
};
const unsupported: WebsiteSearchResponse = {
  kind: "unsupported",
  query: "x",
  message: "I couldn't find a verified answer.",
  relatedResults: [],
};

describe("formatDuration", () => {
  it("formats seconds as M:SS", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(605)).toBe("10:05");
  });
  it("never goes negative", () => {
    expect(formatDuration(-10)).toBe("0:00");
  });
});

describe("stripCitationMarkers", () => {
  it("removes [n] markers and collapses whitespace", () => {
    expect(stripCitationMarkers("Do X [1]. Then Y [2].")).toBe("Do X . Then Y .".replace(/\s{2,}/g, " "));
    expect(stripCitationMarkers("a [12]  b")).toBe("a b");
  });
});

describe("isEscalationResponse", () => {
  it("is true for unsupported and error, false otherwise", () => {
    expect(isEscalationResponse(unsupported)).toBe(true);
    expect(isEscalationResponse({ kind: "error", message: "x" })).toBe(true);
    expect(isEscalationResponse(answered)).toBe(false);
    expect(
      isEscalationResponse({ kind: "clarification", query: "q", message: "m", suggestedQuestions: [] }),
    ).toBe(false);
  });
});

describe("spokenTextFor", () => {
  it("speaks the answer without citation markers", () => {
    expect(spokenTextFor(answered)).toBe("You can order transcripts online .".replace(/\s{2,}/g, " "));
  });
  it("speaks the message for non-answered kinds", () => {
    expect(spokenTextFor(unsupported)).toBe("I couldn't find a verified answer.");
  });
});

describe("buildSummary", () => {
  it("counts caller questions, dedupes cited sources, and flags escalation", () => {
    const transcript: TranscriptEntry[] = [
      { id: "1", role: "assistant", variant: "text", text: GREETING },
      { id: "2", role: "caller", text: "How do I order transcripts?" },
      { id: "3", role: "assistant", variant: "answer", response: answered },
      { id: "4", role: "caller", text: "How do I drop a class?" },
      { id: "5", role: "assistant", variant: "answer", response: unsupported },
    ];
    const summary = buildSummary({ elapsedSeconds: 92, transcript });
    expect(summary.durationLabel).toBe("1:32");
    expect(summary.questionCount).toBe(2);
    expect(summary.citedSources).toHaveLength(1);
    expect(summary.citedSources[0]?.title).toBe("Transcripts | Lemoore College");
    expect(summary.escalationRecommended).toBe(true);
  });

  it("reports no escalation and no sources for an empty call", () => {
    const summary = buildSummary({ elapsedSeconds: 0, transcript: [] });
    expect(summary.questionCount).toBe(0);
    expect(summary.citedSources).toEqual([]);
    expect(summary.escalationRecommended).toBe(false);
  });

  it("does not duplicate a source cited across two answers", () => {
    const transcript: TranscriptEntry[] = [
      { id: "1", role: "caller", text: "q1" },
      { id: "2", role: "assistant", variant: "answer", response: answered },
      { id: "3", role: "caller", text: "q2" },
      { id: "4", role: "assistant", variant: "answer", response: answered },
    ];
    expect(buildSummary({ elapsedSeconds: 10, transcript }).citedSources).toHaveLength(1);
  });
});
