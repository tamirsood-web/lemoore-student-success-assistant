// Redaction utility for logging (server-only, deterministic).
//
// Produces a minimized, safe-to-log record. It never stores the raw prompt: obvious
// sensitive tokens (SSN-like, long digit runs, emails, phone-like) are masked and the
// text is collapsed and truncated (AGENTS.md §11/§12; requirements.md Req 6.3).

import type { RedactFn } from "@/types";

const MAX_REDACTED_LENGTH = 120;

/** Mask obvious sensitive tokens and minimize a free-text question for logging. */
export function redactQuestion(question: string): string {
  let text = question;
  text = text.replace(/[\w.+-]+@[\w.-]+\.\w+/g, "[redacted-email]");
  text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted-id]");
  text = text.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[redacted-number]");
  text = text.replace(/\b\d{4,}\b/g, "[redacted-number]");
  text = text.replace(/\s+/g, " ").trim();
  if (text.length > MAX_REDACTED_LENGTH) {
    text = `${text.slice(0, MAX_REDACTED_LENGTH)}…`;
  }
  return text;
}

/** Build a minimized log record. Never includes the raw prompt. */
export const redact: RedactFn = (input) => ({
  mode: input.mode ?? "public",
  ...(input.category ? { category: input.category } : {}),
  confidence: input.confidence,
  escalationRecommended: input.escalationRecommended,
  redactedQuestion: redactQuestion(input.question),
  latencyMs: input.latencyMs,
});
