import { describe, it, expect, vi } from "vitest";
import {
  buildOpeningSequence,
  audioInput,
  encodeEvent,
  buildSystemPrompt,
  ASSISTANT_NAME,
  GREETING,
  KB_TOOL_NAME,
  kbToolSpec,
  parseToolInput,
  toToolResult,
  toSpokenAnswer,
  runKbTool,
  resampleFloat32,
  floatToPcm16,
  pcm16ToFloat,
  int16ToBase64,
  base64ToInt16,
  base64DecodedByteLength,
  normalizeNovaOutput,
  parseClientMessage,
  encodeBridgeMessage,
  isAllowedOrigin,
  resolveNovaBridgeConfig,
  createNovaSession,
  NovaInputQueue,
  type BridgeMessage,
  type NovaOutput,
} from "./index";
import type { WebsiteSearchResponse } from "@/types";

/* --------------------------------- events --------------------------------- */

describe("Nova input event construction + ordering", () => {
  it("builds the opening sequence in the required order with tool config", () => {
    const seq = buildOpeningSequence({
      promptName: "p1",
      systemContentName: "s1",
      systemPrompt: "be nice",
      tools: [kbToolSpec()],
    });
    const types = seq.map((e) => Object.keys(e.event)[0]);
    expect(types).toEqual(["sessionStart", "promptStart", "contentStart", "textInput", "contentEnd"]);
    const promptStart = seq[1]!.event.promptStart as Record<string, unknown>;
    expect(promptStart.promptName).toBe("p1");
    expect((promptStart.audioOutputConfiguration as { sampleRateHertz: number }).sampleRateHertz).toBe(24000);
    expect(promptStart.toolConfiguration).toBeDefined();
  });

  it("audioInput carries base64 content under the prompt/content names", () => {
    const ev = audioInput({ promptName: "p", contentName: "c", base64: "AAAA" });
    expect(ev.event.audioInput).toEqual({ promptName: "p", contentName: "c", content: "AAAA" });
  });

  it("encodeEvent produces decodable UTF-8 JSON", () => {
    const bytes = encodeEvent({ event: { sessionEnd: {} } });
    expect(JSON.parse(new TextDecoder().decode(bytes))).toEqual({ event: { sessionEnd: {} } });
  });
});

/* ------------------------------ system prompt ------------------------------ */

describe("system prompt", () => {
  it("names the assistant, mandates the tool, and forbids private records / invented facts", () => {
    const p = buildSystemPrompt();
    expect(p).toContain(ASSISTANT_NAME);
    expect(p).toContain("search_lemoore_knowledge_base");
    expect(p.toLowerCase()).toContain("never invent");
    expect(p.toLowerCase()).toContain("private student records");
    expect(p).toContain("Thank you for calling Lemoore College Student Support");
  });

  it("greets exactly once with the canonical greeting text", () => {
    const p = buildSystemPrompt();
    expect(p).toContain(GREETING);
    expect(p.toLowerCase()).toContain("greet the caller exactly once");
    expect(p.toLowerCase()).toContain("only once per call");
  });

  it("requires concise 1-2 sentence answers and allows a third only for specific cases", () => {
    const p = buildSystemPrompt();
    expect(p).toContain("1-2 short spoken sentences");
    expect(p.toLowerCase()).toContain("answer immediately and directly");
    expect(p.toLowerCase()).toContain("third sentence");
  });

  it("forbids repeated introductions, re-greeting, and treating a turn as a new call", () => {
    const p = buildSystemPrompt();
    const lower = p.toLowerCase();
    expect(lower).toContain("never reintroduce yourself");
    expect(lower).toContain("never greet again");
    expect(lower).toContain("never as a new call");
    expect(lower).toContain("after a tool result");
  });

  it("bans stock filler phrases and does not ask if more help is needed after every answer", () => {
    const p = buildSystemPrompt();
    expect(p).toContain("Is there anything else I can help you with?");
    expect(p).toContain("Great question");
    expect(p).toContain("I'd be happy to help with that");
    expect(p.toLowerCase()).toContain("do not end your answers by asking whether the caller needs anything else");
  });

  it("keeps sources on screen, preserves context, and forbids reading long URLs aloud", () => {
    const p = buildSystemPrompt();
    expect(p.toLowerCase()).toContain("shown on screen");
    expect(p.toLowerCase()).toContain("do not read long web addresses aloud");
    expect(p.toLowerCase()).toContain("maintain context across follow-up questions");
  });
});

/* ---------------------------------- tool ---------------------------------- */

describe("KB tool schema + result mapping", () => {
  it("exposes the tool spec with a JSON input schema requiring `question`", () => {
    const spec = kbToolSpec();
    expect(spec.toolSpec.name).toBe(KB_TOOL_NAME);
    const schema = JSON.parse(spec.toolSpec.inputSchema.json);
    expect(schema.required).toContain("question");
  });

  it("parses valid tool input and rejects malformed input", () => {
    expect(parseToolInput('{"question":"How do I apply?"}')).toEqual({ question: "How do I apply?" });
    expect(parseToolInput("not json")).toBeNull();
    expect(parseToolInput('{"nope":1}')).toBeNull();
  });

  it("maps an answered response to a grounded, deduped, official-only result and strips URLs from speech", () => {
    const response: WebsiteSearchResponse = {
      kind: "answered",
      query: "transcripts",
      answer: "Order at https://www.parchment.com/x for $7.38 [1].",
      citations: [
        { id: "a", title: "Transcripts | Lemoore College", excerpt: "e", url: "https://lemoorecollege.edu/resources/transcripts.php" },
        { id: "b", title: "Dup", excerpt: "e", url: "https://lemoorecollege.edu/resources/transcripts.php/" },
        { id: "c", title: "Off domain", excerpt: "e", url: "https://evil.example.com/x" },
        { id: "d", title: "No url", excerpt: "e" },
      ],
      relatedResults: [],
    };
    const result = toToolResult(response);
    expect(result.status).toBe("answered");
    expect(result.answer).not.toMatch(/https?:\/\//); // no spoken URL
    expect(result.answer).not.toContain("[1]");
    expect(result.citations).toHaveLength(1); // dup collapsed, off-domain + url-less dropped
    expect(result.citations[0]?.url).toBe("https://lemoorecollege.edu/resources/transcripts.php");
    expect(result.escalationRecommended).toBe(false);
  });

  it("maps unsupported → escalation, error → escalation, and never leaks detail", () => {
    expect(toToolResult({ kind: "unsupported", query: "q", message: "cannot verify", relatedResults: [] })).toMatchObject({
      status: "unsupported",
      escalationRecommended: true,
      citations: [],
    });
    expect(toToolResult({ kind: "error", message: "boom" })).toMatchObject({ status: "error", escalationRecommended: true });
  });

  it("toSpokenAnswer removes markers and URLs", () => {
    expect(toSpokenAnswer("See https://x.y/z now [2].")).toBe("See the link shown on screen now .".replace(/\s{2,}/g, " "));
  });

  it("runKbTool dispatches to the injected grounded service (grounded, unsupported, error)", async () => {
    const grounded = vi.fn<(q: string) => Promise<WebsiteSearchResponse>>().mockResolvedValue({
      kind: "answered",
      query: "q",
      answer: "Yes.",
      citations: [{ id: "a", title: "T", excerpt: "e", url: "https://lemoorecollege.edu/x" }],
      relatedResults: [],
    });
    expect(await runKbTool('{"question":"hi"}', { answer: grounded })).toMatchObject({ status: "answered" });
    expect(grounded).toHaveBeenCalledWith("hi");

    const unsupported = vi.fn<(q: string) => Promise<WebsiteSearchResponse>>().mockResolvedValue({ kind: "unsupported", query: "q", message: "no", relatedResults: [] });
    expect(await runKbTool('{"question":"x"}', { answer: unsupported })).toMatchObject({ status: "unsupported" });

    const throws = vi.fn<(q: string) => Promise<WebsiteSearchResponse>>().mockRejectedValue(new Error("aws boom"));
    const res = await runKbTool('{"question":"x"}', { answer: throws });
    expect(res.status).toBe("error");
    expect(JSON.stringify(res)).not.toMatch(/aws boom/);
  });
});

/* --------------------------------- audio ---------------------------------- */

describe("audio DSP", () => {
  it("resamples length by the rate ratio", () => {
    const input = new Float32Array(48000).fill(0.5);
    expect(resampleFloat32(input, 48000, 16000).length).toBe(16000);
    expect(resampleFloat32(input, 16000, 16000)).not.toBe(input); // returns a copy
  });

  it("converts Float32↔Int16 round-trip within tolerance and clamps", () => {
    const f = new Float32Array([0, 0.5, -0.5, 2, -2]);
    const pcm = floatToPcm16(f);
    expect(pcm[3]).toBe(32767); // clamped +
    expect(pcm[4]).toBe(-32768); // clamped -
    const back = pcm16ToFloat(pcm);
    expect(back[1]).toBeCloseTo(0.5, 2);
    expect(back[2]).toBeCloseTo(-0.5, 2);
  });

  it("base64 round-trips Int16 PCM and estimates decoded length", () => {
    const pcm = new Int16Array([1, -1, 1000, -1000]);
    const b64 = int16ToBase64(pcm);
    expect(Array.from(base64ToInt16(b64))).toEqual([1, -1, 1000, -1000]);
    expect(base64DecodedByteLength(b64)).toBe(8);
  });
});

/* ---------------------------- output normalization ---------------------------- */

describe("Nova output normalization", () => {
  const wrap = (event: Record<string, unknown>) => ({ event });
  it("normalizes audio, caller/assistant transcript, tool use, interruption, completion", () => {
    expect(normalizeNovaOutput(wrap({ audioOutput: { content: "b64" } }))).toEqual({ kind: "audio", base64: "b64" });
    expect(normalizeNovaOutput(wrap({ textOutput: { role: "USER", content: "hi" } }))).toEqual({ kind: "transcript", role: "caller", text: "hi" });
    expect(normalizeNovaOutput(wrap({ textOutput: { role: "ASSISTANT", content: "hello" } }))).toEqual({ kind: "transcript", role: "assistant", text: "hello" });
    expect(normalizeNovaOutput(wrap({ toolUse: { toolName: "t", toolUseId: "id", content: "{}" } }))).toEqual({ kind: "toolUse", toolName: "t", toolUseId: "id", input: "{}" });
    expect(normalizeNovaOutput(wrap({ contentEnd: { stopReason: "INTERRUPTED" } }))).toEqual({ kind: "interruption" });
    expect(normalizeNovaOutput(wrap({ completionEnd: {} }))).toEqual({ kind: "completionEnd" });
  });
  it("collapses error-shaped events to a safe generic error", () => {
    expect(normalizeNovaOutput(wrap({ internalServerException: { message: "secret arn:aws" } }))).toEqual({ kind: "error" });
    expect(normalizeNovaOutput(wrap({ modelStreamErrorException: {} }))).toEqual({ kind: "error" });
  });
});

/* ------------------------- websocket message validation ------------------------- */

describe("client→bridge message validation", () => {
  it("accepts valid messages", () => {
    expect(parseClientMessage(JSON.stringify({ t: "start" })).ok).toBe(true);
    expect(parseClientMessage(JSON.stringify({ t: "audio", data: "AAAA" })).ok).toBe(true);
    expect(parseClientMessage(JSON.stringify({ t: "mute", value: true })).ok).toBe(true);
  });
  it("rejects malformed JSON, unknown types, and non-base64 audio", () => {
    expect(parseClientMessage("{bad").ok).toBe(false);
    expect(parseClientMessage(JSON.stringify({ t: "nope" })).ok).toBe(false);
    expect(parseClientMessage(JSON.stringify({ t: "audio", data: "!!!not base64!!!" })).ok).toBe(false);
  });
  it("enforces message size, audio-chunk size, and text length limits", () => {
    const bigMsg = JSON.stringify({ t: "text", data: "x".repeat(10) });
    expect(parseClientMessage(bigMsg, { maxMessageBytes: 5, maxAudioChunkBytes: 999999, maxTextChars: 999 }).ok).toBe(false);
    const bigAudio = JSON.stringify({ t: "audio", data: "QUFB".repeat(100) });
    expect(parseClientMessage(bigAudio, { maxMessageBytes: 1e6, maxAudioChunkBytes: 8, maxTextChars: 999 }).ok).toBe(false);
    const longText = JSON.stringify({ t: "text", data: "x".repeat(50) });
    const r = parseClientMessage(longText, { maxMessageBytes: 1e6, maxAudioChunkBytes: 1e6, maxTextChars: 10 });
    expect(r.ok).toBe(false);
  });
});

describe("origin restriction + bridge message encoding", () => {
  it("allows only exact configured origins", () => {
    const allowed = ["http://localhost:3000", "http://127.0.0.1:3000"];
    expect(isAllowedOrigin("http://localhost:3000", allowed)).toBe(true);
    expect(isAllowedOrigin("http://evil.example.com", allowed)).toBe(false);
    expect(isAllowedOrigin(undefined, allowed)).toBe(false);
  });
  it("default config binds localhost and allows only the local Next origin", () => {
    const cfg = resolveNovaBridgeConfig({});
    expect(cfg.host).toBe("127.0.0.1");
    expect(cfg.allowedOrigins.every((o) => o.includes("localhost") || o.includes("127.0.0.1"))).toBe(true);
  });
  it("bridge messages never contain AWS ids/arns (representative sample)", () => {
    const samples: BridgeMessage[] = [
      { t: "status", state: "listening" },
      { t: "transcript", role: "assistant", text: "hi" },
      { t: "citations", items: [{ title: "T", url: "https://lemoorecollege.edu/x" }] },
      { t: "error", message: "unavailable" },
    ];
    for (const m of samples) {
      expect(encodeBridgeMessage(m)).not.toMatch(/arn:aws|\b\d{12}\b|amazon\.nova/);
    }
  });
});

/* ----------------------------- session lifecycle ----------------------------- */

// Fake invoke: captures the input event stream and returns a controllable output stream.
function makeFakeInvoke() {
  const captured: Array<Record<string, unknown>> = [];
  const outputs = new NovaInputQueue(); // reused: yields {chunk:{bytes}} shaped items
  const invoke = vi.fn(async ({ body }: { modelId: string; body: AsyncIterable<{ chunk: { bytes: Uint8Array } }> }) => {
    void (async () => {
      for await (const chunk of body) {
        captured.push(JSON.parse(new TextDecoder().decode(chunk.chunk.bytes)));
      }
    })();
    return outputs as unknown as AsyncIterable<{ chunk?: { bytes?: Uint8Array } }>;
  });
  return { invoke, captured, outputs };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("Nova session lifecycle (fake invoke, no AWS)", () => {
  it("emits opening sequence + audio content, streams audio, dispatches tool result, and closes on end", async () => {
    const { invoke, captured, outputs } = makeFakeInvoke();
    const seenOutputs: NovaOutput[] = [];
    let ids = 0;
    const session = await createNovaSession({
      invoke,
      modelId: "amazon.nova-2-sonic-v1:0",
      systemPrompt: "sys",
      tools: [kbToolSpec()],
      newId: (p) => `${p}${(ids += 1)}`,
      onOutput: (o) => void seenOutputs.push(o),
    });
    await flush();

    // Opening sequence + continuous audio content opened.
    const openingTypes = captured.map((e) => Object.keys((e as { event: Record<string, unknown> }).event)[0]);
    expect(openingTypes.slice(0, 6)).toEqual([
      "sessionStart",
      "promptStart",
      "contentStart",
      "textInput",
      "contentEnd",
      "contentStart", // audio content
    ]);

    session.sendAudio("QUFB");
    session.sendToolResult("tid", JSON.stringify({ status: "answered" }));
    await flush();
    const types = captured.map((e) => Object.keys((e as { event: Record<string, unknown> }).event)[0]);
    expect(types).toContain("audioInput");
    // tool result trio present in order.
    const toolStart = types.indexOf("contentStart", 6);
    expect(types.slice(toolStart, toolStart + 3)).toEqual(["contentStart", "toolResult", "contentEnd"]);

    // Output events are normalized and delivered.
    outputs.push({ event: { textOutput: { role: "USER", content: "hi" } } } as never);
    outputs.push({ event: { audioOutput: { content: "b64" } } } as never);
    await flush();
    expect(seenOutputs).toContainEqual({ kind: "transcript", role: "caller", text: "hi" });
    expect(seenOutputs).toContainEqual({ kind: "audio", base64: "b64" });

    // Ending closes the session: contentEnd(audio) + promptEnd + sessionEnd, and no more sends.
    await session.end();
    await flush();
    const endTypes = captured.map((e) => Object.keys((e as { event: Record<string, unknown> }).event)[0]);
    expect(endTypes.slice(-3)).toEqual(["contentEnd", "promptEnd", "sessionEnd"]);
    expect(session.isActive()).toBe(false);
    session.sendAudio("QUFB"); // ignored after end
    await flush();
    expect(captured.map((e) => Object.keys((e as { event: Record<string, unknown> }).event)[0]).filter((t) => t === "audioInput")).toHaveLength(1);
    outputs.close();
  });
});

/* ---------- conversation: exactly one greeting per call, one continuous call (fake invoke) ---------- */

type Captured = Array<Record<string, unknown>>;
const eventType = (e: Record<string, unknown>) => Object.keys((e as { event: Record<string, unknown> }).event)[0];
const typesOf = (captured: Captured) => captured.map(eventType);
const countType = (captured: Captured, type: string) => typesOf(captured).filter((t) => t === type).length;
const promptNamesOf = (captured: Captured): Set<string> => {
  const names = new Set<string>();
  for (const e of captured) {
    const ev = (e as { event: Record<string, unknown> }).event;
    const payload = ev[Object.keys(ev)[0] as string];
    if (payload && typeof payload === "object" && typeof (payload as { promptName?: unknown }).promptName === "string") {
      names.add((payload as { promptName: string }).promptName);
    }
  }
  return names;
};

async function startConversation(systemPrompt = "SYSTEM PROMPT — greet once, then be concise.") {
  const { invoke, captured, outputs } = makeFakeInvoke();
  const seenOutputs: NovaOutput[] = [];
  let ids = 0;
  const session = await createNovaSession({
    invoke,
    modelId: "amazon.nova-2-sonic-v1:0",
    systemPrompt,
    tools: [kbToolSpec()],
    newId: (p) => `${p}${(ids += 1)}`,
    onOutput: (o) => void seenOutputs.push(o),
  });
  await flush();
  return { session, captured, outputs, seenOutputs };
}

describe("Nova conversation: exactly one greeting, one continuous call (fake invoke, no AWS)", () => {
  it("queues the greeting-triggering opening (promptStart + one SYSTEM prompt) exactly once at call start", async () => {
    const { session, captured, outputs } = await startConversation();
    expect(countType(captured, "sessionStart")).toBe(1);
    expect(countType(captured, "promptStart")).toBe(1);
    expect(countType(captured, "textInput")).toBe(1); // the single SYSTEM prompt content
    expect(session.greetingSent()).toBe(true);
    outputs.close();
  });

  it("re-calling start() is idempotent: no second greeting, no second system prompt", async () => {
    const { session, captured, outputs } = await startConversation();
    session.start();
    session.start();
    await flush();
    expect(countType(captured, "promptStart")).toBe(1);
    expect(countType(captured, "textInput")).toBe(1);
    outputs.close();
  });

  it("a second caller question (more audio) stays in the same call and never re-sends the opening/greeting", async () => {
    const { session, captured, outputs } = await startConversation();
    session.sendAudio("QUFB"); // question 1 audio
    session.sendAudio("QkJC"); // follow-up question audio
    await flush();
    expect(countType(captured, "promptStart")).toBe(1);
    expect(countType(captured, "textInput")).toBe(1);
    expect(countType(captured, "audioInput")).toBe(2);
    outputs.close();
  });

  it("a Knowledge Base tool result continues the same call and never re-sends the opening/greeting", async () => {
    const { session, captured, outputs } = await startConversation();
    session.sendToolResult(
      "tid",
      JSON.stringify({ status: "answered", answer: "You can order transcripts online.", citations: [], escalationRecommended: false }),
    );
    await flush();
    expect(countType(captured, "promptStart")).toBe(1);
    expect(countType(captured, "textInput")).toBe(1); // no NEW system prompt after the tool result
    expect(session.toolRunCount()).toBe(1);
    outputs.close();
  });

  it("runs two or more tool results within ONE Nova session (single prompt, single greeting)", async () => {
    const { session, captured, outputs } = await startConversation();
    session.sendToolResult("t1", JSON.stringify({ status: "answered" }));
    session.sendToolResult("t2", JSON.stringify({ status: "answered" }));
    await flush();
    expect(session.toolRunCount()).toBe(2);
    expect(countType(captured, "toolResult")).toBe(2);
    expect(countType(captured, "promptStart")).toBe(1);
    // Every event that carries a prompt name uses the SAME one → one continuous conversation.
    expect(promptNamesOf(captured)).toEqual(new Set([session.promptName]));
    outputs.close();
  });

  it("remains the same active conversation across audio + tool + audio turns", async () => {
    const { session, captured, outputs } = await startConversation();
    session.sendAudio("QUFB");
    session.sendToolResult("t1", JSON.stringify({ status: "answered" }));
    session.sendAudio("QkJC");
    await flush();
    expect(promptNamesOf(captured)).toEqual(new Set([session.promptName]));
    expect(countType(captured, "promptStart")).toBe(1);
    expect(session.isActive()).toBe(true);
    outputs.close();
  });

  it("interruption / barge-in output still flows through as an interruption signal", async () => {
    const { outputs, seenOutputs } = await startConversation();
    outputs.push({ event: { contentEnd: { stopReason: "INTERRUPTED" } } } as never);
    outputs.push({ event: { textOutput: { role: "ASSISTANT", content: '{"interrupted":true}' } } } as never);
    await flush();
    expect(seenOutputs).toContainEqual({ kind: "interruption" });
    expect(seenOutputs.filter((o) => o.kind === "interruption")).toHaveLength(2);
    outputs.close();
  });

  it("ending a call then starting a brand-new call allows exactly one fresh greeting per call", async () => {
    const first = await startConversation();
    await first.session.end();
    await flush();
    const second = await startConversation(); // a completely new Nova session

    // Each call sends its own single opening (one promptStart + one SYSTEM prompt) → one greeting.
    expect(countType(first.captured, "promptStart")).toBe(1);
    expect(countType(first.captured, "textInput")).toBe(1);
    expect(countType(second.captured, "promptStart")).toBe(1);
    expect(countType(second.captured, "textInput")).toBe(1);
    expect(first.session).not.toBe(second.session);
    expect(second.session.greetingSent()).toBe(true);
    second.outputs.close();
  });

  it("a Knowledge Base tool result carries no greeting, identity, or filler text", async () => {
    const result = toToolResult({
      kind: "answered",
      query: "transcripts",
      answer: "You can order transcripts online [1].",
      citations: [
        { id: "a", title: "Transcripts | Lemoore College", excerpt: "e", url: "https://lemoorecollege.edu/resources/transcripts.php" },
      ],
      relatedResults: [],
    });
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/thank you for calling/i);
    expect(json).not.toMatch(/virtual student assistant/i);
    expect(json).not.toMatch(/i'?d be happy to help/i);
    expect(json).not.toMatch(/great question/i);
    expect(result.answer).not.toMatch(/https?:\/\//); // no raw URL spoken

    // Same guarantee end-to-end through runKbTool.
    const viaTool = await runKbTool('{"question":"How do I order transcripts?"}', {
      answer: async () => ({
        kind: "answered",
        query: "q",
        answer: "Order online.",
        citations: [{ id: "a", title: "Transcripts | Lemoore College", excerpt: "e", url: "https://lemoorecollege.edu/x" }],
        relatedResults: [],
      }),
    });
    expect(JSON.stringify(viaTool)).not.toMatch(/thank you for calling|virtual student assistant|great question/i);
  });
});
