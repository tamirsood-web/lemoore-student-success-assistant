// POST /api/chat — public student chat endpoint (server-only).
//
// Runs the deterministic pipeline in a fixed order: validate → guardrail → (reject) →
// retrieve → compose → escalate → normalize → redacted log → typed JSON. It reuses the
// Group 3 validation and Group 5 seam implementations unchanged. No AWS/Bedrock/DynamoDB
// calls; no client-supplied privileged fields are trusted (only `message` is read).

import { NextResponse } from "next/server";
import type { EscalationDecision, RetrievalResult } from "@/types";
import { parseChatRequest } from "@/lib/validation";
import {
  screen,
  retrieve,
  composeAnswer,
  applyEscalationRules,
  toAssistantResponse,
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
    const { message } = parsed.data;

    // 2. Guardrail screening (query treated purely as data).
    const guardrail = screen(message);

    // 3. Sensitive rejection → normal 200 typed AssistantResponse.
    if (!guardrail.ok) {
      const response = toAssistantResponse({
        guardrail,
        result: EMPTY_RESULT,
        composedAnswer: null,
        escalation: NO_ESCALATION,
      });
      logInteraction(message, response.confidence, response.escalationRecommended, {
        category: guardrail.category,
        startedAt,
      });
      return NextResponse.json(response, { status: 200 });
    }

    // 4–7. Retrieve → compose → escalate → normalize.
    const result = await retrieve(message);
    const composedAnswer = composeAnswer(result);
    const escalation = applyEscalationRules({ result, composedAnswer, query: message });
    const response = toAssistantResponse({
      guardrail,
      result,
      composedAnswer,
      escalation,
    });

    // 8. Redacted, minimized log only (never the raw prompt or a sensitive value).
    logInteraction(message, response.confidence, response.escalationRecommended, {
      category:
        response.kind === "insufficient_evidence"
          ? response.escalation.reason
          : undefined,
      startedAt,
    });

    // 9. Typed JSON.
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
