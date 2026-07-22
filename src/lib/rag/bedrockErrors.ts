// AWS/Bedrock error normalization (server-only).
//
// Maps any failure into a SAFE public response (no AWS exception names, IDs, or internal
// messages) plus an INTERNAL-only category safe to log. The public wording is uniform so a
// caller can't distinguish "access denied" from "not found" etc.

import type { WebsiteSearchResponse } from "@/types";

export const SERVICE_UNAVAILABLE_MESSAGE =
  "The student information service is temporarily unavailable. Please try again shortly " +
  "or use the official Lemoore College website.";

/** Coarse, non-sensitive category used only for internal logs/metrics. */
export type BedrockErrorCategory =
  | "config"
  | "access_denied"
  | "not_found"
  | "validation"
  | "throttling"
  | "quota_exceeded"
  | "timeout"
  | "network"
  | "dependency"
  | "internal";

/** Classify an unknown error into a safe internal category. */
export function classifyError(err: unknown): BedrockErrorCategory {
  const name =
    (err as { name?: string } | undefined)?.name ??
    (err as { code?: string } | undefined)?.code ??
    "";
  switch (name) {
    case "AccessDeniedException":
      return "access_denied";
    case "ResourceNotFoundException":
      return "not_found";
    case "ValidationException":
      return "validation";
    case "ThrottlingException":
    case "TooManyRequestsException":
      return "throttling";
    case "ServiceQuotaExceededException":
      return "quota_exceeded";
    case "TimeoutError":
    case "AbortError":
    case "RequestAbortedError":
      return "timeout";
    case "InternalServerException":
    case "DependencyFailedException":
    case "ModelNotReadyException":
    case "ServiceUnavailableException":
      return "dependency";
    default:
      break;
  }
  // Network-ish fallbacks (fetch/undici/node).
  const code = (err as { code?: string } | undefined)?.code ?? "";
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENETUNREACH/.test(code)) {
    return "network";
  }
  if (err instanceof Error && /timed out|timeout|aborted/i.test(err.message)) {
    return "timeout";
  }
  return "internal";
}

/** A uniform safe error response for any Bedrock/AWS failure. */
export function safeErrorResponse(): Extract<WebsiteSearchResponse, { kind: "error" }> {
  return { kind: "error", message: SERVICE_UNAVAILABLE_MESSAGE };
}
