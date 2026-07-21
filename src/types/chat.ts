// Request-body domain types for the chat and feedback endpoints.
//
// These are plain TypeScript shapes only. The Zod schemas that validate them at the
// server boundary are added later (tasks Group 3) and are expected to infer to these
// types. No client-supplied role/mode is represented here — mode is server-derived and
// fixed to "public" in this phase (AGENTS.md §11).

/** Validated body of `POST /api/chat`. */
export type ChatRequestBody = {
  readonly message: string;
};

/**
 * Input accepted by `POST /api/feedback` and passed to the feedback sink. Mirrors the
 * AGENTS.md §12 Feedback entity minus server-assigned fields (`feedbackId`, `createdAt`).
 */
export type FeedbackInput = {
  readonly conversationId: string;
  readonly helpful: boolean;
  readonly reason?: string;
};

/** Alias: the feedback request body is the same shape as the sink input in this phase. */
export type FeedbackRequestBody = FeedbackInput;
