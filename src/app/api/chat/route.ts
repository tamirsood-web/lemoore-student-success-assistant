// POST /api/chat — public, rate-limited student query endpoint.
//
// Flow (AGENTS.md §3 / ARCHITECTURE.md Core Server Flow):
//   1. Validate request body with Zod.
//   2. Screen for sensitive identifiers (guardrail).
//   3. Retrieve supporting snippets.
//   4. Compose an answer from retrieved content only.
//   5. Apply deterministic escalation rules.
//   6. Normalize to the AssistantResponse wire contract.
//   7. Return JSON. Never log the raw prompt.

import { NextRequest, NextResponse } from "next/server";
import { parseChatRequest } from "@/lib/validation";
import {
  retrieve,
  screen,
  applyEscalationRules,
  composeAnswer,
  suggestFollowUps,
  toAssistantResponse,
} from "@/lib/bedrock";

// Basic in-memory rate limiter (IP-keyed). Replace with Redis/DynamoDB in production.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseChatRequest(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }

  const { message } = parsed.data;

  const guardrail = screen(message);
  const result = await retrieve(message);
  const composedAnswer = guardrail.ok ? composeAnswer(result) : null;
  const escalation = applyEscalationRules({ result, composedAnswer });
  const suggestedQuestions = suggestFollowUps(result);

  const response = toAssistantResponse({
    guardrail,
    result,
    composedAnswer,
    escalation,
    suggestedQuestions,
  });

  return NextResponse.json(response);
}
