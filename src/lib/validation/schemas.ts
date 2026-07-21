// Zod schemas for request bodies (server-only, framework-independent).
//
// These validate the *shape* of incoming requests only. Sensitive-data screening and any
// guardrail behavior are NOT here — they live in the guardrail seam (tasks Group 5).
// Unknown properties are stripped by default, so a client cannot smuggle a role/mode
// through these schemas (AGENTS.md §11: do not trust client-supplied roles).

import { z } from "zod";
import type { ChatRequestBody, FeedbackInput } from "@/types";
import { getEnv } from "./env";
import { safeParse, type ValidationResult } from "./parse";

/** Maximum length of an optional free-text feedback comment. */
export const FEEDBACK_REASON_MAX_CHARS = 500;

const EMPTY_QUESTION_MESSAGE = "Please enter a question.";

/**
 * Build the chat-request schema for a given maximum question length. Exposed as a factory
 * so tests and callers can bind their own limit; the app uses {@link chatRequestSchema}.
 */
export function buildChatRequestSchema(maxInputChars: number) {
  return z.object({
    message: z
      .string({
        required_error: EMPTY_QUESTION_MESSAGE,
        invalid_type_error: EMPTY_QUESTION_MESSAGE,
      })
      .trim()
      .min(1, EMPTY_QUESTION_MESSAGE)
      .max(
        maxInputChars,
        `Your question is too long. Please keep it under ${maxInputChars} characters.`,
      ),
  });
}

/** Chat-request schema bound to the configured `CHAT_MAX_INPUT_CHARS`. */
export const chatRequestSchema = buildChatRequestSchema(
  getEnv().chatMaxInputChars,
);

/** Feedback-request schema. `reason` is an optional short free-text comment. */
export const feedbackRequestSchema = z.object({
  conversationId: z
    .string({ required_error: "Missing conversation reference." })
    .trim()
    .min(1, "Missing conversation reference."),
  helpful: z.boolean({
    required_error: "Please indicate whether the answer was helpful.",
    invalid_type_error: "Please indicate whether the answer was helpful.",
  }),
  reason: z
    .string()
    .trim()
    .max(
      FEEDBACK_REASON_MAX_CHARS,
      `Please keep your comment under ${FEEDBACK_REASON_MAX_CHARS} characters.`,
    )
    .optional(),
});

/** Validate a chat request body; returns a structured, user-safe result. */
export function parseChatRequest(input: unknown): ValidationResult<ChatRequestBody> {
  return safeParse(chatRequestSchema, input);
}

/** Validate a feedback request body; returns a structured, user-safe result. */
export function parseFeedbackRequest(
  input: unknown,
): ValidationResult<FeedbackInput> {
  return safeParse(feedbackRequestSchema, input);
}

// --- Compile-time conformance with the existing domain contracts -------------------
// Types are inferred from the schemas only insofar as they agree with the hand-authored
// contracts in `@/types`. If either drifts, typecheck breaks here.
type Assert<T extends true> = T;
type _ChatToDomain = Assert<
  z.infer<typeof chatRequestSchema> extends ChatRequestBody ? true : false
>;
type _DomainToChat = Assert<
  ChatRequestBody extends z.infer<typeof chatRequestSchema> ? true : false
>;
type _FeedbackToDomain = Assert<
  z.infer<typeof feedbackRequestSchema> extends FeedbackInput ? true : false
>;
type _DomainToFeedback = Assert<
  FeedbackInput extends z.infer<typeof feedbackRequestSchema> ? true : false
>;
