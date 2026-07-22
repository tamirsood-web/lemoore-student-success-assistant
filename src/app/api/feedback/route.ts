// POST /api/feedback — accepts helpful/unhelpful feedback (server-only).
//
// Validates with the existing feedback Zod schema and forwards to the no-op feedback
// repository. Returns { ok: true } on success, a user-safe 400 on invalid input, and a
// generic 500 on unexpected failure. No persistence, no AWS, no network.

import { NextResponse } from "next/server";
import { parseFeedbackRequest } from "@/lib/validation";
import { recordFeedback } from "@/lib/db/feedback";

export const runtime = "nodejs";

const GENERIC_ERROR_MESSAGE =
  "Something went wrong while handling your request. Please try again.";
const UNREADABLE_REQUEST_MESSAGE =
  "We couldn't read your request. Please try again.";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: UNREADABLE_REQUEST_MESSAGE },
        { status: 400 },
      );
    }

    const parsed = parseFeedbackRequest(body);
    if (!parsed.success) {
      return NextResponse.json(parsed, { status: 400 });
    }

    const result = await recordFeedback(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 500 });
  }
}
