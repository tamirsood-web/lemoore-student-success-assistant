// POST /api/chat — public student chat endpoint (server-only).
//
// Runs the deterministic pipeline in a fixed order: validate → guardrail → (reject) →
// retrieve → compose → escalate → normalize → redacted log → typed JSON. It reuses the
// Group 3 validation and Group 5 seam implementations unchanged. No AWS/Bedrock/DynamoDB
// calls; no client-supplied privileged fields are trusted (only `message` is read).

import { NextResponse } from "next/server";
import type { EscalationDecision, RetrievalResult } from "@/types";
import type { FallbackScenario } from "@/lib/fallback-messages";
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

// Placeholders for the guardrail-rejection branch, where retrieval/escalation are skipped.
const EMPTY_RESULT: RetrievalResult = { intent: "source", snippets: [] };
const NO_ESCALATION: EscalationDecision = {
  escalationRecommended: false,
  confidence: "low",
};

function errorResponse(
  status: number,
  fallbackScenario: FallbackScenario,
): NextResponse {
  return NextResponse.json({ fallbackScenario }, { status });
}

/**
 * Determine the fallback scenario for a non-grounded response based on the structured
 * retrieval and escalation state. Prefers structured status over text matching.
 */
function resolveFallbackScenario(
  result: RetrievalResult,
  escalation: EscalationDecision,
): FallbackScenario | null {
  // No snippets returned → noSearchResults
  if (result.snippets.length === 0) {
    // If the query needed identifiers (course-date disambiguation), suggest more info.
    if (result.intent === "course-date" && result.needsIdentifiers) {
      return "needsMoreInformation";
    }
    return "noSearchResults";
  }

  // Snippets found but escalation still recommended → noReliableAnswer
  if (escalation.escalationRecommended) {
    return "noReliableAnswer";
  }

  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const startedAt = Date.now();
  try {
    // 1. Parse + validate.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "technicalError");
    }

    const parsed = parseChatRequest(body);
    if (!parsed.success) {
      return errorResponse(400, "technicalError");
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

    // 9. Attach fallback scenario when the response is not a grounded answer.
    const fallbackScenario = resolveFallbackScenario(result, escalation);
    if (fallbackScenario) {
      return NextResponse.json({ ...response, fallbackScenario }, { status: 200 });
    }

    // 10. Typed JSON (grounded answer).
    return NextResponse.json(response, { status: 200 });
  } catch {
    // Never leak internal detail.
    return errorResponse(500, "technicalError");
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
