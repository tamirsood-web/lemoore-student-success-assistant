// Normalize Nova 2 Sonic OUTPUT events into a small, safe, discriminated union (pure).
//
// The bridge reacts to these; it NEVER forwards raw Nova event JSON to the browser. Unknown or
// internal events collapse to `{ kind: "other" }`; any error-shaped event collapses to a safe
// generic `error` (no AWS detail).

export type NovaOutput =
  | { readonly kind: "audio"; readonly base64: string }
  | { readonly kind: "transcript"; readonly role: "caller" | "assistant"; readonly text: string }
  | { readonly kind: "toolUse"; readonly toolUseId: string; readonly toolName: string; readonly input: string }
  | { readonly kind: "interruption" }
  | { readonly kind: "completionEnd" }
  | { readonly kind: "other"; readonly type: string }
  | { readonly kind: "error" };

const ERROR_EVENT_RE = /error|exception/i;

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Normalize one parsed `{ event: {...} }` object. */
export function normalizeNovaOutput(parsed: unknown): NovaOutput {
  const event =
    parsed && typeof parsed === "object" && "event" in parsed
      ? ((parsed as { event?: Record<string, unknown> }).event ?? {})
      : {};
  const type = Object.keys(event)[0];
  if (!type) return { kind: "other", type: "empty" };

  if (ERROR_EVENT_RE.test(type)) return { kind: "error" };

  const payload = (event[type] ?? {}) as Record<string, unknown>;

  switch (type) {
    case "audioOutput": {
      const base64 = str(payload.content);
      return base64 ? { kind: "audio", base64 } : { kind: "other", type };
    }
    case "textOutput": {
      const role = str(payload.role).toUpperCase();
      const text = str(payload.content);
      // Some interruption signals arrive as a textOutput content flag.
      if (/"interrupted"\s*:\s*true/i.test(text)) return { kind: "interruption" };
      if (role === "USER") return { kind: "transcript", role: "caller", text };
      if (role === "ASSISTANT") return { kind: "transcript", role: "assistant", text };
      return { kind: "other", type };
    }
    case "toolUse": {
      return {
        kind: "toolUse",
        toolUseId: str(payload.toolUseId),
        toolName: str(payload.toolName),
        input: str(payload.content),
      };
    }
    case "contentEnd": {
      if (str(payload.stopReason).toUpperCase() === "INTERRUPTED") return { kind: "interruption" };
      return { kind: "other", type };
    }
    case "completionEnd":
      return { kind: "completionEnd" };
    default:
      return { kind: "other", type };
  }
}
