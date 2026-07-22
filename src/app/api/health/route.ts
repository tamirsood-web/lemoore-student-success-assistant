// GET /api/health — liveness + safe readiness probe (server-only).
//
// Exposes ONLY: overall status, the selected RAG provider name, and whether the required
// configuration for that provider is present. It never exposes region, KB id, model ARN,
// account id, credentials, buckets, or session data, and it makes NO paid Bedrock request
// (config readiness is a pure local validation).

import { NextResponse } from "next/server";
import { getEnv } from "@/lib/validation";
import { resolveBedrockConfig } from "@/lib/rag/bedrockConfig";

export const runtime = "nodejs";

export function GET(): NextResponse {
  const provider =
    (process.env.RAG_PROVIDER ?? "").trim().toLowerCase() === "bedrock"
      ? "bedrock"
      : "local";

  // local mode is always ready; bedrock readiness = config resolves to "ok".
  let configured = true;
  if (provider === "bedrock") {
    configured = resolveBedrockConfig(getEnv()).status === "ok";
  }

  return NextResponse.json({ status: "ok", provider, configured }, { status: 200 });
}
