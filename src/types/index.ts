// Barrel for the shared domain types. Import from "@/types" rather than reaching into
// individual modules, so the public type surface stays stable as the internals evolve.

export type {
  NonEmptyReadonlyArray,
  Confidence,
  SourceId,
  Citation,
  SafeRejection,
  ResponseKind,
  Section9Response,
  GroundedResponse,
  InsufficientEvidenceResponse,
  SafeRejectionResponse,
  AssistantResponse,
} from "./assistant";

export type {
  EscalationReason,
  DepartmentContact,
  EscalationGuidance,
} from "./escalation";

export type { SourceAudience, Source, CourseDate } from "./source";

export type {
  OfficialChunk,
  OfficialSource,
  OfficialSourceCitation,
  RagProvider,
  WebsiteSearchResponse,
  WebsiteSearchResponseKind,
} from "./search";

export type { SensitiveCategory, GuardrailVerdict } from "./guardrail";

export type {
  RetrievalIntent,
  RetrievedSnippet,
  RetrievalResult,
} from "./retrieval";

export type { ChatRequestBody, FeedbackInput, FeedbackRequestBody } from "./chat";

export type { LogMode, RedactedLogRecord, RedactInput } from "./logging";

export type {
  RetrieveFn,
  RetrievalService,
  GuardrailScreenFn,
  GuardrailService,
  EscalationDecision,
  ApplyEscalationRulesFn,
  EscalationPolicy,
  NormalizeInput,
  ToAssistantResponseFn,
  ResponseNormalizer,
  RedactFn,
  Redactor,
  RecordFeedbackFn,
  FeedbackRepository,
} from "./services";
