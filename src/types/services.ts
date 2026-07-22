// Server-side seam interfaces.
//
// These are the contracts that future implementations satisfy. In the local MVP they are
// fulfilled by mock bodies (tasks Group 5); in a later phase the same signatures are
// fulfilled by AWS-backed implementations (Bedrock retrieval/guardrails, DynamoDB
// persistence). Depending only on these seams — never on a concrete implementation — is
// what keeps the AWS swap contained (design.md → Architecture / Components and Interfaces;
// requirements.md Req 9.2 / Correctness Property 8).

import type { AssistantResponse, Confidence } from "./assistant";
import type { EscalationReason } from "./escalation";
import type { GuardrailVerdict } from "./guardrail";
import type { RedactInput, RedactedLogRecord } from "./logging";
import type { FeedbackInput } from "./chat";
import type { RetrievalResult } from "./retrieval";

// --- Retrieval seam ----------------------------------------------------------------

/** Retrieve supporting snippets for a query. Backed by mock now, Bedrock KB later. */
export type RetrieveFn = (query: string) => Promise<RetrievalResult>;

export interface RetrievalService {
  readonly retrieve: RetrieveFn;
}

// --- Guardrail seam ----------------------------------------------------------------

/** Screen a query for sensitive data. Backed by rules now, Bedrock Guardrails later. */
export type GuardrailScreenFn = (query: string) => GuardrailVerdict;

export interface GuardrailService {
  readonly screen: GuardrailScreenFn;
}

// --- Escalation seam ---------------------------------------------------------------

/**
 * The deterministic escalation decision computed in the server layer, independent of any
 * model output (AGENTS.md §10). `applyEscalationRules` returns this given the retrieval
 * result and the composed answer (design.md → Components and Interfaces).
 */
export type EscalationDecision = {
  readonly escalationRecommended: boolean;
  readonly department?: string;
  readonly confidence: Confidence;
  readonly reason?: EscalationReason;
};

export type ApplyEscalationRulesFn = (input: {
  readonly result: RetrievalResult;
  readonly composedAnswer: string | null;
  /**
   * The original user query, used to deterministically detect query-driven escalation
   * reasons (safety, private/student-specific, conflicting, binding-policy, high-stakes)
   * per AGENTS.md §10. Treated strictly as data — never as instructions.
   */
  readonly query?: string;
}) => EscalationDecision;

export interface EscalationPolicy {
  readonly applyEscalationRules: ApplyEscalationRulesFn;
}

// --- Normalization seam ------------------------------------------------------------

/** Everything the normalizer needs to assemble a typed {@link AssistantResponse}. */
export type NormalizeInput = {
  readonly guardrail: GuardrailVerdict;
  readonly result: RetrievalResult;
  readonly composedAnswer: string | null;
  readonly escalation: EscalationDecision;
  readonly suggestedQuestions?: readonly string[];
};

/** Map raw retrieval/guardrail/escalation state to the wire contract. */
export type ToAssistantResponseFn = (input: NormalizeInput) => AssistantResponse;

export interface ResponseNormalizer {
  readonly toAssistantResponse: ToAssistantResponseFn;
}

// --- Redaction seam ----------------------------------------------------------------

/** Produce a minimized, safe-to-log record; never logs the raw prompt. */
export type RedactFn = (input: RedactInput) => RedactedLogRecord;

export interface Redactor {
  readonly redact: RedactFn;
}

// --- Persistence seam --------------------------------------------------------------

/** Record student feedback. No-op sink now, DynamoDB later. */
export type RecordFeedbackFn = (
  input: FeedbackInput,
) => Promise<{ readonly ok: true }>;

export interface FeedbackRepository {
  readonly record: RecordFeedbackFn;
}
