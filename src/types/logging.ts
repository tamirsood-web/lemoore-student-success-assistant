// Redacted-logging seam types.
//
// The redaction utility (tasks Group 5) and any future persistence of conversation
// metadata must log only minimized, non-sensitive data — never the raw prompt
// (AGENTS.md §11, §12; requirements.md Req 6.3). These types describe that minimized shape.

import type { Confidence } from "./assistant";

/** Interaction mode recorded alongside a conversation (AGENTS.md §12). */
export type LogMode = "public" | "ambassador";

/**
 * The minimized, safe-to-log record for a single interaction. Contains a redacted form of
 * the question only; it must never carry the raw prompt or any sensitive identifier.
 */
export type RedactedLogRecord = {
  readonly mode: LogMode;
  readonly category?: string;
  readonly confidence: Confidence;
  readonly escalationRecommended: boolean;
  readonly redactedQuestion: string;
  readonly latencyMs: number;
};

/** Input a redactor accepts to produce a {@link RedactedLogRecord}. */
export type RedactInput = {
  readonly question: string;
  readonly confidence: Confidence;
  readonly escalationRecommended: boolean;
  readonly latencyMs: number;
  readonly category?: string;
  readonly mode?: LogMode;
};
