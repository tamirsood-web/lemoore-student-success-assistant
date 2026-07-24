// POST /api/search — the shared grounded-answer endpoint (server-only).
//
// Serves BOTH the website search UI and the floating assistant. It validates the request,
// runs the configured provider's shared pipeline, validates the response against the wire
// contract (so a malformed/off-domain citation can never reach the browser), and returns
// typed JSON. No AWS/Bedrock config is ever exposed to the client; local mode makes no
// network calls.

import { NextResponse } from "next/server";
import { parseSearchRequest, websiteSearchResponseSchema } from "@/lib/validation";
import { getSearchProvider } from "@/lib/rag";

export const runtime = "nodejs";

const GENERIC_ERROR = "Something went wrong while searching. Please try again.";
const UNREADABLE_REQUEST = "We couldn't read your request. Please try again.";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ kind: "error", message: UNREADABLE_REQUEST }, { status: 400 });
    }

    const parsed = parseSearchRequest(body);
    if (!parsed.success) {
      const message = parsed.issues[0]?.message ?? "Invalid request.";
      return NextResponse.json({ kind: "error", message }, { status: 400 });
    }

    const response = await getSearchProvider().answer(parsed.data.query, parsed.data.history);

    // Validate our own output: never ship a response that violates the contract
    // (e.g. an answered response missing citations, or an off-domain URL).
    const checked = websiteSearchResponseSchema.safeParse(response);
    if (!checked.success) {
      return NextResponse.json({ kind: "error", message: GENERIC_ERROR }, { status: 200 });
    }

    return NextResponse.json(checked.data, { status: 200 });
  } catch {
    return NextResponse.json({ kind: "error", message: GENERIC_ERROR }, { status: 500 });
  }
}
