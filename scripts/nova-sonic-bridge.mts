// Local Nova 2 Sonic WebSocket bridge — SERVER/SCRIPT-ONLY. Never runs in the browser.
//
//   npm run sonic:bridge      (or `npm run dev:sonic` to start it alongside Next)
//
// Browser mic/text → this bridge → Bedrock InvokeModelWithBidirectionalStream (Nova 2 Sonic)
// → tool call to the existing grounded search service → Nova audio/transcript → browser.
//
// Security: binds to localhost, allows only the configured Next origin, validates + size/rate-
// limits every message, one Nova session per connection, idle + max-duration timeouts. Logs are
// coarse and redacted: never audio, transcripts, prompts, AWS ids, or raw Nova/AWS payloads.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";

import {
  resolveNovaBridgeConfig,
  isAllowedOrigin,
  NOVA_LIMITS,
  buildSystemPrompt,
  kbToolSpec,
  runKbTool,
  parseClientMessage,
  encodeBridgeMessage,
  BRIDGE_SAFE_ERROR,
  createNovaSession,
  type NovaSession,
  type BridgeMessage,
  type NovaOutput,
} from "../src/lib/nova-sonic/index.ts";
import { createBedrockNovaInvoke } from "../src/lib/nova-sonic/bedrockNovaClient.ts";
import { getSearchProvider } from "../src/lib/rag/index.ts";
import { toToolResult } from "../src/lib/nova-sonic/tool.ts";

const ROOT = process.cwd();
function loadEnvFile(file: string): void {
  const path = resolve(ROOT, file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
    if (!m) continue;
    const key = m[1] as string;
    let value = (m[2] ?? "").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const config = resolveNovaBridgeConfig();
const invoke = createBedrockNovaInvoke(config.region);
const answer = (query: string) => getSearchProvider().answer(query);

let idSeq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idSeq += 1)}`;

/** Coarse, redacted operational log (never transcripts/audio/ids/payloads). */
function log(event: string, fields: Record<string, string | number | boolean> = {}): void {
  console.info("[nova-bridge]", { event, ...fields });
}

class Connection {
  private session: NovaSession | undefined;
  private muted = false;
  private closed = false;
  private msgTimes: number[] = [];
  private idleTimer: NodeJS.Timeout | undefined;
  private durationTimer: NodeJS.Timeout | undefined;
  private warnTimer: NodeJS.Timeout | undefined;
  private toolRuns = 0;
  private readonly cid: string;

  constructor(private readonly ws: WebSocket) {
    this.cid = newId("conn");
  }

  init(): void {
    log("connection_open", { cid: this.cid });
    this.ws.on("message", (data) => void this.onMessage(data));
    this.ws.on("close", () => this.cleanup("socket-closed"));
    this.ws.on("error", () => this.cleanup("socket-error"));
  }

  private send(message: BridgeMessage): void {
    if (this.closed || this.ws.readyState !== this.ws.OPEN) return;
    this.ws.send(encodeBridgeMessage(message));
  }

  private rateLimited(): boolean {
    const now = Date.now();
    this.msgTimes = this.msgTimes.filter((t) => now - t < 1000);
    this.msgTimes.push(now);
    return this.msgTimes.length > NOVA_LIMITS.maxMessagesPerSecond;
  }

  private resetIdle(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.cleanup("idle-timeout"), NOVA_LIMITS.idleTimeoutMs);
  }

  private async onMessage(data: unknown): Promise<void> {
    if (this.closed) return;
    if (this.rateLimited()) {
      log("rate_limited", { cid: this.cid });
      return;
    }
    const raw = typeof data === "string" ? data : data instanceof Buffer ? data.toString("utf8") : "";
    const parsed = parseClientMessage(raw, NOVA_LIMITS);
    if (!parsed.ok) {
      log("bad_message", { cid: this.cid, reason: parsed.reason });
      return;
    }
    this.resetIdle();
    const message = parsed.message;

    switch (message.t) {
      case "start":
        await this.startSession();
        break;
      case "audio":
        if (this.session && !this.muted) this.session.sendAudio(message.data);
        break;
      case "text":
        await this.handleTypedText(message.data);
        break;
      case "mute":
        this.muted = message.value;
        this.send({ t: "status", state: this.muted ? "muted" : "listening" });
        break;
      case "end":
        this.cleanup("client-end");
        break;
    }
  }

  private async startSession(): Promise<void> {
    if (this.session) return;
    this.send({ t: "status", state: "connecting" });
    try {
      this.session = await createNovaSession({
        invoke,
        modelId: config.modelId,
        systemPrompt: buildSystemPrompt(),
        tools: [kbToolSpec()],
        newId,
        onOutput: (o) => this.onNovaOutput(o),
        onClose: (reason) => {
          log("nova_session_closed", { cid: this.cid, reason, toolRuns: this.toolRuns });
        },
        onError: () => this.send({ t: "error", message: BRIDGE_SAFE_ERROR }),
      });
      log("nova_session_started", { cid: this.cid });
      this.send({ t: "status", state: "listening" });
      // Session-duration guardrails.
      this.warnTimer = setTimeout(
        () => this.send({ t: "warning", kind: "session-ending", secondsLeft: Math.round(NOVA_LIMITS.sessionWarnBeforeMs / 1000) }),
        NOVA_LIMITS.maxSessionMs - NOVA_LIMITS.sessionWarnBeforeMs,
      );
      this.durationTimer = setTimeout(() => this.cleanup("max-duration"), NOVA_LIMITS.maxSessionMs);
      this.resetIdle();
    } catch {
      log("nova_session_error", { cid: this.cid });
      this.send({ t: "error", message: BRIDGE_SAFE_ERROR });
    }
  }

  private async onNovaOutput(o: NovaOutput): Promise<void> {
    switch (o.kind) {
      case "audio":
        this.send({ t: "audio", data: o.base64 });
        break;
      case "transcript":
        this.send({ t: "transcript", role: o.role, text: o.text });
        this.send({ t: "status", state: o.role === "caller" ? "caller-speaking" : "assistant-speaking" });
        break;
      case "toolUse":
        await this.dispatchTool(o.toolUseId, o.input);
        break;
      case "interruption":
        this.send({ t: "interruption" });
        break;
      case "completionEnd":
        this.send({ t: "status", state: "listening" });
        break;
      case "error":
        this.send({ t: "error", message: BRIDGE_SAFE_ERROR });
        break;
      case "other":
        break;
    }
  }

  private async dispatchTool(toolUseId: string, input: string): Promise<void> {
    this.toolRuns += 1;
    log("tool_use", { cid: this.cid, run: this.toolRuns });
    this.send({ t: "tool", state: "searching" });
    this.send({ t: "status", state: "searching" });
    const result = await runKbTool(input, { answer });
    if (this.session) this.session.sendToolResult(toolUseId, JSON.stringify(result));
    if (result.citations.length > 0) {
      this.send({ t: "citations", items: result.citations });
    }
    this.send({ t: "tool", state: "done", escalationRecommended: result.escalationRecommended });
    log("tool_result", { cid: this.cid, status: result.status, citations: result.citations.length });
  }

  // Typed input: Nova 2 Sonic accepts SPEECH user turns only, so typed questions are answered by
  // the SAME grounded search service and shown in the SAME transcript (never faked as Nova audio).
  private async handleTypedText(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.send({ t: "transcript", role: "caller", text: trimmed });
    this.send({ t: "status", state: "searching" });
    let result;
    try {
      result = toToolResult(await answer(trimmed));
    } catch {
      this.send({ t: "error", message: BRIDGE_SAFE_ERROR });
      return;
    }
    this.send({ t: "transcript", role: "assistant", text: result.answer });
    if (result.citations.length > 0) this.send({ t: "citations", items: result.citations });
    this.send({ t: "tool", state: "done", escalationRecommended: result.escalationRecommended });
    this.send({ t: "status", state: this.session ? "listening" : "voice-unavailable" });
    log("typed_answer", { cid: this.cid, status: result.status, citations: result.citations.length });
  }

  private cleanup(reason: string): void {
    if (this.closed) return;
    this.closed = true;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.durationTimer) clearTimeout(this.durationTimer);
    if (this.warnTimer) clearTimeout(this.warnTimer);
    const session = this.session;
    this.session = undefined;
    if (session) void session.end().catch(() => undefined);
    this.send({ t: "ended", reason: reason.replace(/[^a-z-]/gi, "") });
    log("connection_close", { cid: this.cid, reason });
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

function start(): void {
  let server: WebSocketServer;
  try {
    server = new WebSocketServer({
      host: config.host,
      port: config.wsPort,
      maxPayload: NOVA_LIMITS.maxMessageBytes,
      verifyClient: (info, cb) => {
        const ok = isAllowedOrigin(info.origin, config.allowedOrigins);
        if (!ok) log("origin_rejected", {});
        cb(ok, 403, "Forbidden origin");
      },
    });
  } catch (err) {
    console.error(`[nova-bridge] failed to start: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
    return;
  }

  server.on("listening", () => {
    log("bridge_listening", { host: config.host, port: config.wsPort, region: config.region });
    console.info(
      `[nova-bridge] Nova 2 Sonic bridge on ws://${config.host}:${config.wsPort} ` +
        `(model=${config.modelId}, allowed origins: ${config.allowedOrigins.join(", ")})`,
    );
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[nova-bridge] Port ${config.wsPort} is already in use. Free it or set NOVA_SONIC_WS_PORT to a different port.`,
      );
    } else {
      console.error(`[nova-bridge] server error: ${err.message}`);
    }
    process.exit(1);
  });
  server.on("connection", (ws) => new Connection(ws).init());

  const shutdown = () => {
    log("bridge_shutdown", {});
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start();
