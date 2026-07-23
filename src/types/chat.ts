// Request-body domain types for the chat and feedback endpoints.
//
// These are plain TypeScript shapes only. The Zod schemas that validate them at the
// server boundary are added later (tasks Group 3) and are expected to infer to these
// types. No client-supplied role/mode is represented here — mode is server-derived and
// fixed to "public" in this phase (AGENTS.md §11).

/**
 * A single turn in the conversation history sent with a chat request.
 * Only the last 4 settled turns are included; content is truncated client-side.
 */
export type HistoryTurn = {
  readonly role: "user" | "assistant";
  readonly content: string;
};

/** Validated body of `POST /api/chat`. */
export type ChatRequestBody = {
  readonly message: string;
  /** Recent conversation history (optional, max 4 turns). */
  readonly history?: HistoryTurn[];
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
