// POST /api/feedback — stores helpful/unhelpful signal for a conversation.
// MVP: validated and logged; AWS phase writes to DynamoDB.

import { NextRequest, NextResponse } from "next/server";
import { parseFeedbackRequest } from "@/lib/validation";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseFeedbackRequest(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.message }, { status: 400 });
  }

  const { conversationId, helpful, reason } = parsed.data;

  // Log redacted record only — no PII stored. Replace with DynamoDB write later.
  console.log("[feedback]", { conversationId, helpful, hasReason: Boolean(reason) });

  return NextResponse.json({ ok: true });
}
