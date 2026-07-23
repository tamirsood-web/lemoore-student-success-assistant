// Browser ↔ bridge WebSocket message contract + strict validation (pure).
//
// Every client→bridge message is validated (shape, size, audio-chunk size, text length) before
// the bridge acts on it; malformed input is rejected safely. Bridge→client messages are small,
// typed, and never contain AWS ids, prompts, raw Nova JSON, or internal error detail.

import { z } from "zod";
import { NOVA_LIMITS } from "./config";
import { base64DecodedByteLength } from "./audio";

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

/* ----------------------------- client → bridge ----------------------------- */

export type ClientMessage =
  | { readonly t: "start" }
  | { readonly t: "audio"; readonly data: string }
  | { readonly t: "text"; readonly data: string }
  | { readonly t: "mute"; readonly value: boolean }
  | { readonly t: "end" };

const clientMessageSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("start") }),
  z.object({ t: z.literal("audio"), data: z.string() }),
  z.object({ t: z.literal("text"), data: z.string() }),
  z.object({ t: z.literal("mute"), value: z.boolean() }),
  z.object({ t: z.literal("end") }),
]);

export type ParseResult =
  | { readonly ok: true; readonly message: ClientMessage }
  | { readonly ok: false; readonly reason: string };

type Limits = {
  maxMessageBytes: number;
  maxAudioChunkBytes: number;
  maxTextChars: number;
};

/** Validate + size-check one raw client message. `raw` is the WebSocket text frame. */
export function parseClientMessage(
  raw: string,
  limits: Limits = NOVA_LIMITS,
): ParseResult {
  if (typeof raw !== "string") return { ok: false, reason: "non-text-frame" };
  // Byte length (UTF-8) guard before parsing.
  const byteLength = typeof Buffer !== "undefined" ? Buffer.byteLength(raw, "utf8") : raw.length;
  if (byteLength > limits.maxMessageBytes) return { ok: false, reason: "message-too-large" };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  const parsed = clientMessageSchema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: "invalid-shape" };
  const message = parsed.data;

  if (message.t === "audio") {
    if (!BASE64_RE.test(message.data)) return { ok: false, reason: "audio-not-base64" };
    if (base64DecodedByteLength(message.data) > limits.maxAudioChunkBytes) {
      return { ok: false, reason: "audio-chunk-too-large" };
    }
  }
  if (message.t === "text" && message.data.length > limits.maxTextChars) {
    return { ok: false, reason: "text-too-long" };
  }

  return { ok: true, message };
}

/* ----------------------------- bridge → client ----------------------------- */

/** Coarse UI states surfaced to the browser (never AWS/internal detail). */
export type BridgeState =
  | "connecting"
  | "mic-permission-needed"
  | "listening"
  | "caller-speaking"
  | "thinking"
  | "searching"
  | "assistant-speaking"
  | "muted"
  | "reconnecting"
  | "voice-unavailable"
  | "ended";

export type BridgeCitation = { readonly title: string; readonly url: string };

export type BridgeMessage =
  | { readonly t: "status"; readonly state: BridgeState }
  | { readonly t: "transcript"; readonly role: "caller" | "assistant"; readonly text: string }
  | { readonly t: "audio"; readonly data: string }
  | { readonly t: "citations"; readonly items: readonly BridgeCitation[] }
  | { readonly t: "tool"; readonly state: "searching" | "done"; readonly escalationRecommended?: boolean }
  | { readonly t: "interruption" }
  | { readonly t: "warning"; readonly kind: "session-ending"; readonly secondsLeft: number }
  | { readonly t: "error"; readonly message: string }
  | { readonly t: "ended"; readonly reason: string }
  | { readonly t: "diag"; readonly data: Record<string, string | number | boolean> };

/** Uniform safe error text sent to the browser for ANY bridge/Nova/AWS failure. */
export const BRIDGE_SAFE_ERROR =
  "The voice assistant is temporarily unavailable. You can keep typing your questions below.";

export function encodeBridgeMessage(message: BridgeMessage): string {
  return JSON.stringify(message);
}
