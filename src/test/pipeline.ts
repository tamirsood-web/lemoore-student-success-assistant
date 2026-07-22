// Test-only helper: runs the local mock chat pipeline exactly as POST /api/chat does,
// but without HTTP or logging, so property/eval tests can inspect the intermediate pieces
// (guardrail verdict, retrieval result, composed answer, escalation decision) alongside
// the final AssistantResponse.
//
// This intentionally mirrors the fixed order in src/app/api/chat/route.ts:
//   screen → (reject) → retrieve → compose → applyEscalationRules → toAssistantResponse.
// It reads ONLY the local mock seams (Group 5) and makes no network/AWS calls.
//
// It is not a test file (no `*.test` suffix) and is imported only by tests; it is never
// referenced by application code, so it never enters the client bundle.

import type {
  AssistantResponse,
  EscalationDecision,
  GuardrailVerdict,
  RetrievalResult,
} from "@/types";
import {
  applyEscalationRules,
  composeAnswer,
  retrieve,
  screen,
  toAssistantResponse,
} from "@/lib/bedrock";

/** All the pipeline stages for a single query, for white-box property assertions. */
export type PipelineOutcome = {
  readonly guardrail: GuardrailVerdict;
  readonly result: RetrievalResult;
  readonly composedAnswer: string | null;
  readonly escalation: EscalationDecision;
  readonly response: AssistantResponse;
};

// Matches the route's placeholders for the guardrail-rejection branch.
const EMPTY_RESULT: RetrievalResult = { intent: "source", snippets: [] };
const NO_ESCALATION: EscalationDecision = {
  escalationRecommended: false,
  confidence: "low",
};

/** Run the deterministic local mock pipeline for `query`. Network-free. */
export async function runMockPipeline(
  query: string,
  suggestedQuestions?: readonly string[],
): Promise<PipelineOutcome> {
  const guardrail = screen(query);

  // Sensitive rejection short-circuits before retrieval, exactly like the route.
  if (!guardrail.ok) {
    const response = toAssistantResponse({
      guardrail,
      result: EMPTY_RESULT,
      composedAnswer: null,
      escalation: NO_ESCALATION,
      suggestedQuestions,
    });
    return {
      guardrail,
      result: EMPTY_RESULT,
      composedAnswer: null,
      escalation: NO_ESCALATION,
      response,
    };
  }

  const result = await retrieve(query);
  const composedAnswer = composeAnswer(result);
  const escalation = applyEscalationRules({ result, composedAnswer, query });
  const response = toAssistantResponse({
    guardrail,
    result,
    composedAnswer,
    escalation,
    suggestedQuestions,
  });

  return { guardrail, result, composedAnswer, escalation, response };
}
