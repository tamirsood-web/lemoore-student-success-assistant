// POST /api/chat — public student chat endpoint (server-only).
//
// Pipeline order:
//   validate → rewrite (follow-up → standalone) → guardrail → (reject) →
//   retrieve → compose → escalate → normalize → redacted log → typed JSON
//
// History is accepted as optional context for the rewriter only. No client-supplied
// privileged fields are trusted — only `message` and `history` are read, and history
// is treated purely as data, never as instructions (prompt-injection resilience).

import { NextResponse } from "next/server";
import type { EscalationDecision, RetrievalResult } from "@/types";
import { parseChatRequest } from "@/lib/validation";
import {
  screen,
  retrieve,
  composeAnswer,
  applyEscalationRules,
  toAssistantResponse,
  rewriteIfFollowUp,
} from "@/lib/bedrock";
import { redact } from "@/lib/utils/redact";

export const runtime = "nodejs";

const GENERIC_ERROR_MESSAGE =
  "Something went wrong while handling your request. Please try again.";
const UNREADABLE_REQUEST_MESSAGE =
  "We couldn't read your request. Please try again.";

// Placeholders for the guardrail-rejection branch, where retrieval/escalation are skipped.
const EMPTY_RESULT: RetrievalResult = { intent: "source", snippets: [] };
const NO_ESCALATION: EscalationDecision = {
  escalationRecommended: false,
  confidence: "low",
};

function errorResponse(status: number, message: string): NextResponse {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const startedAt = Date.now();
  try {
    // 1. Parse + validate.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, UNREADABLE_REQUEST_MESSAGE);
    }

    const parsed = parseChatRequest(body);
    if (!parsed.success) {
      return NextResponse.json(parsed, { status: 400 });
    }
    const { message, history } = parsed.data;

    // 2. Rewrite follow-up into a standalone question using history context.
    //    History is data only — injected instructions inside history are inert.
    const query = rewriteIfFollowUp(message, history);

    // 3. Guardrail screening (query treated purely as data).
    const guardrail = screen(query);

    // 4. Sensitive rejection → normal 200 typed AssistantResponse.
    if (!guardrail.ok) {
      const response = toAssistantResponse({
        guardrail,
        result: EMPTY_RESULT,
        composedAnswer: null,
        escalation: NO_ESCALATION,
      });
      logInteraction(query, response.confidence, response.escalationRecommended, {
        category: guardrail.category,
        startedAt,
      });
      return NextResponse.json(response, { status: 200 });
    }

    // 5–8. Retrieve → compose → escalate → normalize.
    const result = await retrieve(query);
    const composedAnswer = composeAnswer(result);
    const escalation = applyEscalationRules({ result, composedAnswer, query });
    const response = toAssistantResponse({
      guardrail,
      result,
      composedAnswer,
      escalation,
    });

    // 9. Redacted, minimized log only (never the raw prompt or a sensitive value).
    logInteraction(query, response.confidence, response.escalationRecommended, {
      category:
        response.kind === "insufficient_evidence"
          ? response.escalation.reason
          : undefined,
      startedAt,
    });

    // 10. Typed JSON.
    return NextResponse.json(response, { status: 200 });
  } catch {
    // Never leak internal detail.
    return errorResponse(500, GENERIC_ERROR_MESSAGE);
  }
}

function logInteraction(
  question: string,
  confidence: "high" | "medium" | "low",
  escalationRecommended: boolean,
  opts: { category?: string; startedAt: number },
): void {
  const record = redact({
    question,
    confidence,
    escalationRecommended,
    latencyMs: Date.now() - opts.startedAt,
    mode: "public",
    ...(opts.category ? { category: opts.category } : {}),
  });
  console.info("[chat]", record);
}
