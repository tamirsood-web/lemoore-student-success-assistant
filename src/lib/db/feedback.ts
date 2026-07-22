// Feedback persistence sink (server-only) — validated NO-OP for the local MVP.
//
// Implements the fixed `FeedbackRepository` / `RecordFeedbackFn` seam (Group 2). It does
// NOT persist anything: no DynamoDB, no AWS, no database, no network API, no filesystem.
// A later phase replaces this body with a DynamoDB-backed implementation behind the same
// signature. Deterministic: always resolves `{ ok: true }` for a validated input.

import type { FeedbackRepository, RecordFeedbackFn } from "@/types";

const record: RecordFeedbackFn = async (input) => {
  // Intentionally does not store the feedback (no persistence in this phase).
  void input;
  return { ok: true };
};

/** The no-op feedback repository behind the fixed seam. */
export const feedbackRepository: FeedbackRepository = { record };

/** Convenience export of the sink function. */
export const recordFeedback: RecordFeedbackFn = feedbackRepository.record;
