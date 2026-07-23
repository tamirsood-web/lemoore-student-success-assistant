// POST /api/chat — public, rate-limited student query endpoint.
//
// Uses Bedrock Knowledge Base retrieve-and-generate when configured;
// falls back to escalation when no results are returned.

import { NextRequest, NextResponse } from "next/server";
import { parseChatRequest } from "@/lib/validation";
import { screen } from "@/lib/bedrock/guardrail";
import { retrieve } from "@/lib/bedrock/retrieve";
import { getDepartment } from "@/lib/mock";
import type {
  AssistantResponse,
  Citation,
  GroundedResponse,
  InsufficientEvidenceResponse,
  SafeRejectionResponse,
} from "@/types";

// --- Rate limiter (in-memory, per cold start) ---
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

// --- Suggested follow-up questions based on answer content ---
function suggestFollowUps(answer: string): string[] {
  const lower = answer.toLowerCase();
  if (lower.includes("financial aid") || lower.includes("fafsa")) {
    return [
      "When does financial aid disburse?",
      "What documents do I need for financial aid?",
    ];
  }
  if (lower.includes("enroll") || lower.includes("register") || lower.includes("registration")) {
    return [
      "How do I add or drop a class?",
      "What are the registration deadlines?",
    ];
  }
  if (lower.includes("transcript") || lower.includes("degree") || lower.includes("graduation")) {
    return [
      "How do I request an official transcript?",
      "How do I check my degree posting status?",
    ];
  }
  if (lower.includes("census") || lower.includes("drop") || lower.includes("withdrawal")) {
    return [
      "What happens if I miss the census date?",
      "How do I officially withdraw from a class?",
    ];
  }
  return [
    "What other services does Lemoore College offer?",
    "How do I contact the relevant office?",
  ];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  // Parse body
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

  // Guardrail screen
  const guardrail = screen(message);
  if (!guardrail.ok) {
    const dept = getDepartment("student_services");
    const response: SafeRejectionResponse = {
      kind: "safe_rejection",
      answer: guardrail.safeMessage,
      confidence: "low",
      citations: [],
      department: guardrail.department,
      escalationRecommended: true,
      rejection: {
        category: "student_id",
        message: guardrail.safeMessage,
        department: guardrail.department,
        contact: dept,
      },
      suggestedQuestions: [],
    };
    return NextResponse.json(response);
  }

  // Bedrock retrieve-and-generate
  let bedrockResult;
  try {
    console.log("[chat] Calling Bedrock retrieve for:", message);
    bedrockResult = await retrieve(message);
    console.log("[chat] Bedrock result:", {
      noResults: bedrockResult.noResults,
      snippetCount: bedrockResult.snippets.length,
      answerLength: bedrockResult.answer.length,
    });
  } catch (err) {
    console.error("[chat] Bedrock error:", err);
    console.error("[chat] Full error:", err instanceof Error ? err.stack : String(err));
    const dept = getDepartment("student_services");
    const response: InsufficientEvidenceResponse = {
      kind: "insufficient_evidence",
      answer:
        "I'm having trouble reaching the knowledge base right now. Please try again in a moment, or contact Student Services for help.",
      confidence: "low",
      citations: [],
      department: dept.name,
      escalationRecommended: true,
      escalation: {
        reason: "no_relevant_source",
        department: dept.name,
        contact: dept,
        message: "The knowledge base is temporarily unavailable. Please contact Student Services.",
      },
      suggestedQuestions: [],
    };
    return NextResponse.json(response);
  }

  // No results → escalate
  if (bedrockResult.noResults || bedrockResult.snippets.length === 0) {
    const dept = getDepartment("student_services");
    const response: InsufficientEvidenceResponse = {
      kind: "insufficient_evidence",
      answer:
        "I could not find verified information about that in the approved college sources. " +
        "Please contact Student Services for confirmation.",
      confidence: "low",
      citations: [],
      department: dept.name,
      escalationRecommended: true,
      escalation: {
        reason: "no_relevant_source",
        department: dept.name,
        contact: dept,
        message:
          "I could not verify that from the approved college sources. Please contact Student Services for confirmation.",
      },
      suggestedQuestions: suggestFollowUps(""),
    };
    return NextResponse.json(response);
  }

  // Build citations from Bedrock snippets
  const citations: [Citation, ...Citation[]] = bedrockResult.snippets.map(
    (snippet, i) => ({
      sourceId: `bedrock-${i}`,
      title: snippet.title,
      uri: snippet.uri,
      excerpt: snippet.text.slice(0, 300),
      sourceType: snippet.sourceType,
    }),
  ) as [Citation, ...Citation[]];

  // Grounded response
  const response: GroundedResponse = {
    kind: "grounded",
    answer: bedrockResult.answer,
    confidence: bedrockResult.snippets.length >= 3 ? "high" : "medium",
    citations,
    escalationRecommended: false,
    suggestedQuestions: suggestFollowUps(bedrockResult.answer),
  };

  return NextResponse.json(response satisfies AssistantResponse);
}
