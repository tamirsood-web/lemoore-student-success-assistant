// Barrel for the validation layer. Import from "@/lib/validation".

export {
  safeParse,
  type ValidationIssue,
  type ValidationSuccess,
  type ValidationFailure,
  type ValidationResult,
} from "./parse";

export {
  DEFAULT_CHAT_MAX_INPUT_CHARS,
  EnvSchema,
  parseEnv,
  loadEnv,
  getEnv,
  type AppConfig,
} from "./env";

export {
  FEEDBACK_REASON_MAX_CHARS,
  HISTORY_CONTENT_MAX_CHARS,
  HISTORY_MAX_TURNS,
  HISTORY_MAX_ITEMS,
  buildChatRequestSchema,
  chatRequestSchema,
  feedbackRequestSchema,
  parseChatRequest,
  parseFeedbackRequest,
} from "./schemas";
