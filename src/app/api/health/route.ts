// GET /api/health — public liveness probe.
import { NextResponse } from "next/server";

export function GET(): NextResponse {
  return NextResponse.json({ status: "ok", ts: new Date().toISOString() });
}
