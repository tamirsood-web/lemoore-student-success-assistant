// Nova 2 Sonic bridge configuration + operational limits (server/script-only).
//
// Resolves from env with safe defaults. Only NEXT_PUBLIC_NOVA_SONIC_WS_URL is ever exposed to
// the browser; the model id, region, account, KB/data-source ids, and credentials never are.

export const NOVA_SONIC_MODEL_ID_DEFAULT = "amazon.nova-2-sonic-v1:0";
export const NOVA_SONIC_REGION_DEFAULT = "us-west-2";
export const NOVA_SONIC_WS_PORT_DEFAULT = 3010;
export const NEXT_APP_PORT_DEFAULT = 3000;

/** Audio formats fixed by the Nova 2 Sonic contract. */
export const AUDIO_INPUT_SAMPLE_RATE = 16000; // caller mic → Nova
export const AUDIO_OUTPUT_SAMPLE_RATE = 24000; // Nova → speakers

/** Operational safety limits for the local bridge. */
export const NOVA_LIMITS = {
  /** Max bytes for any single client→bridge JSON message. */
  maxMessageBytes: 64 * 1024,
  /** Max decoded bytes for one audio chunk (~0.5s of 16kHz/16-bit mono ≈ 16000 bytes). */
  maxAudioChunkBytes: 32 * 1024,
  /** Max client→bridge messages per second before the connection is throttled/closed. */
  maxMessagesPerSecond: 100,
  /** Max typed-text length accepted from the client. */
  maxTextChars: 2000,
  /** Idle (no client input) timeout before the bridge closes the session. */
  idleTimeoutMs: 45_000,
  /** Hard cap on total session duration. */
  maxSessionMs: 8 * 60_000,
  /** Warn the UI this long before the Nova session limit so it can end gracefully. */
  sessionWarnBeforeMs: 30_000,
} as const;

export type NovaBridgeConfig = {
  readonly modelId: string;
  readonly region: string;
  readonly wsPort: number;
  readonly appPort: number;
  /** Exact origins allowed to open a bridge WebSocket (local dev only). */
  readonly allowedOrigins: readonly string[];
  readonly host: string;
};

function toInt(value: string | undefined, fallback: number): number {
  const n = value ? Number.parseInt(value, 10) : NaN;
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : fallback;
}

/** Resolve the bridge configuration from an env source (defaults for local dev). */
export function resolveNovaBridgeConfig(
  env: Record<string, string | undefined> = process.env,
): NovaBridgeConfig {
  const wsPort = toInt(env.NOVA_SONIC_WS_PORT, NOVA_SONIC_WS_PORT_DEFAULT);
  const appPort = toInt(env.PORT, NEXT_APP_PORT_DEFAULT);
  const explicitOrigins = (env.NOVA_SONIC_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins =
    explicitOrigins.length > 0
      ? explicitOrigins
      : [`http://localhost:${appPort}`, `http://127.0.0.1:${appPort}`];
  return {
    modelId: env.NOVA_SONIC_MODEL_ID?.trim() || NOVA_SONIC_MODEL_ID_DEFAULT,
    region: env.AWS_REGION?.trim() || NOVA_SONIC_REGION_DEFAULT,
    wsPort,
    appPort,
    allowedOrigins,
    host: "127.0.0.1",
  };
}

/** True when a WebSocket upgrade Origin header is permitted (exact match, localhost only). */
export function isAllowedOrigin(origin: string | undefined, allowed: readonly string[]): boolean {
  if (!origin) return false;
  return allowed.includes(origin);
}
