// Pure, framework-independent state helpers for the /voice-demo call simulation.
//
// No React, no DOM, no network: everything here is unit-testable in isolation. The call UI
// (VoiceDemo.tsx) holds the React state; this module defines the transcript shape and derives
// the honest call summary (duration, question count, cited sources, escalation) from it.

import type { WebsiteSearchResponse } from "@/types";

/** The AI's opening line when a caller answers the simulated call. */
export const GREETING =
  "Thank you for calling Lemoore College Student Support. I'm the virtual student assistant. " +
  "How can I help you today?";

/** Safe spoken/displayed line for a network/unknown failure (no internal detail). */
export const CALL_ERROR_MESSAGE =
  "I'm sorry — I'm having trouble reaching the college's information service right now. " +
  "Please try again in a moment, or contact the college directly.";

export type CallPhase = "incoming" | "active" | "ended" | "declined";

/** One line in the live transcript. Assistant lines are either plain text (greeting), a
 *  pending placeholder, or a full grounded response rendered with its citations. */
export type TranscriptEntry =
  | { readonly id: string; readonly role: "caller"; readonly text: string }
  | { readonly id: string; readonly role: "assistant"; readonly variant: "text"; readonly text: string }
  | { readonly id: string; readonly role: "assistant"; readonly variant: "pending" }
  | {
      readonly id: string;
      readonly role: "assistant";
      readonly variant: "answer";
      readonly response: WebsiteSearchResponse;
    };

/** Format seconds as `M:SS` (e.g. 75 → "1:15"). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Remove inline `[n]` citation markers so the spoken answer reads naturally. */
export function stripCitationMarkers(text: string): string {
  return text.replace(/\[\d+\]/g, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Escalation is recommended when the assistant could NOT verify an answer from official
 * sources — i.e. an unsupported or error response. `clarification` is a soft re-ask, not an
 * escalation.
 */
export function isEscalationResponse(response: WebsiteSearchResponse): boolean {
  return response.kind === "unsupported" || response.kind === "error";
}

/** The safe text to read aloud / show for a response — response fields only, never internals. */
export function spokenTextFor(response: WebsiteSearchResponse): string {
  switch (response.kind) {
    case "answered":
      return stripCitationMarkers(response.answer);
    case "clarification":
    case "unsupported":
    case "error":
      return response.message;
  }
}

export type CitedSource = { readonly id: string; readonly title: string; readonly url?: string };

export type CallSummary = {
  readonly durationLabel: string;
  readonly questionCount: number;
  readonly citedSources: readonly CitedSource[];
  readonly escalationRecommended: boolean;
};

function isAnswerEntry(
  entry: TranscriptEntry,
): entry is Extract<TranscriptEntry, { variant: "answer" }> {
  return entry.role === "assistant" && "variant" in entry && entry.variant === "answer";
}

/** Derive the end-of-call summary from the elapsed time + transcript. */
export function buildSummary(input: {
  readonly elapsedSeconds: number;
  readonly transcript: readonly TranscriptEntry[];
}): CallSummary {
  const questionCount = input.transcript.filter((e) => e.role === "caller").length;

  const cited = new Map<string, CitedSource>();
  let escalationRecommended = false;

  for (const entry of input.transcript) {
    if (!isAnswerEntry(entry)) continue;
    if (isEscalationResponse(entry.response)) escalationRecommended = true;
    if (entry.response.kind === "answered") {
      for (const c of entry.response.citations) {
        if (!cited.has(c.id)) {
          cited.set(c.id, { id: c.id, title: c.title, ...(c.url ? { url: c.url } : {}) });
        }
      }
    }
  }

  return {
    durationLabel: formatDuration(input.elapsedSeconds),
    questionCount,
    citedSources: [...cited.values()],
    escalationRecommended,
  };
}
