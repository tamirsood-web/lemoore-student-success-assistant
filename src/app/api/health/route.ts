// GET /api/health — liveness probe (server-only).
//
// Returns a fixed status payload. No authentication, no environment dependency, no AWS,
// no database, no user data.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET(): NextResponse {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
