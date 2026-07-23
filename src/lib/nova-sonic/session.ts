// Nova 2 Sonic bidirectional session orchestration (transport-agnostic, testable).
//
// Owns one continuous conversation: it queues the ordered opening sequence, opens ONE long-lived
// user AUDIO content, streams caller audio into it, injects tool-result content when Nova
// requests a tool, and tears the session down cleanly. The actual Bedrock call is injected as
// `invoke`, so automated tests drive the whole lifecycle with a fake and never touch AWS.

import {
  buildOpeningSequence,
  contentStartAudioUser,
  audioInput,
  contentStartToolResult,
  toolResult as toolResultEvent,
  contentEnd,
  promptEnd,
  sessionEnd,
  encodeEvent,
  type NovaEvent,
} from "./events";
import { normalizeNovaOutput, type NovaOutput } from "./outputEvents";
import type { KbToolSpec } from "./tool";

export type InputChunk = { readonly chunk: { readonly bytes: Uint8Array } };
export type OutputChunk = { readonly chunk?: { readonly bytes?: Uint8Array } };

/** The injected Bedrock bidirectional call. Returns the async-iterable output stream. */
export type NovaInvoke = (input: {
  modelId: string;
  body: AsyncIterable<InputChunk>;
}) => Promise<AsyncIterable<OutputChunk>>;

/** An async push-queue that is the bidirectional request body. */
export class NovaInputQueue implements AsyncIterable<InputChunk> {
  private readonly buffer: InputChunk[] = [];
  private readonly waiters: ((r: IteratorResult<InputChunk>) => void)[] = [];
  private closed = false;

  push(event: NovaEvent): void {
    if (this.closed) return;
    const chunk: InputChunk = { chunk: { bytes: encodeEvent(event) } };
    const waiter = this.waiters.shift();
    if (waiter) waiter({ value: chunk, done: false });
    else this.buffer.push(chunk);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    let waiter;
    while ((waiter = this.waiters.shift())) {
      waiter({ value: undefined as unknown as InputChunk, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<InputChunk> {
    return {
      next: (): Promise<IteratorResult<InputChunk>> => {
        const chunk = this.buffer.shift();
        if (chunk) return Promise.resolve({ value: chunk, done: false });
        if (this.closed) return Promise.resolve({ value: undefined as unknown as InputChunk, done: true });
        return new Promise((resolve) => this.waiters.push(resolve));
      },
    };
  }
}

export type NovaSession = {
  /** Idempotent: (re)sending the opening sequence after it has been sent once is a no-op. */
  start(): void;
  sendAudio(base64: string): void;
  sendToolResult(toolUseId: string, resultJson: string): void;
  end(): Promise<void>;
  /** The single prompt id for this call (activePromptId). Stable for the whole session. */
  readonly promptName: string;
  /** The single continuous user-audio content id for this call (activeAudioContentId). */
  readonly audioContentName: string;
  isActive(): boolean;
  /**
   * True once the one-time opening sequence (sessionStart + promptStart + SYSTEM prompt) has been
   * queued. That system prompt is what makes Nova speak the greeting, so this is only ever set
   * once per call and never re-sent — the greeting cannot repeat from a resent opening.
   */
  greetingSent(): boolean;
  /** Number of tool results injected into this session (grows across turns; one session). */
  toolRunCount(): number;
};

export type CreateNovaSessionOptions = {
  readonly invoke: NovaInvoke;
  readonly modelId: string;
  readonly systemPrompt: string;
  readonly tools: readonly KbToolSpec[];
  readonly voiceId?: string;
  readonly newId: (prefix: string) => string;
  readonly onOutput: (output: NovaOutput) => void | Promise<void>;
  readonly onClose?: (reason: string) => void;
  readonly onError?: () => void;
};

/**
 * Create + start a Nova session. Pushes the opening sequence, opens the continuous audio
 * content, begins reading output, and resolves once the stream is open.
 */
export async function createNovaSession(opts: CreateNovaSessionOptions): Promise<NovaSession> {
  const queue = new NovaInputQueue();
  const promptName = opts.newId("prompt");
  const audioContentName = opts.newId("audio");
  const systemContentName = opts.newId("system");
  let active = true;
  let closed = false;
  // Per-call lifecycle state. `greetingSent` guards the ONE-TIME opening (promptStart + SYSTEM
  // prompt), which is what makes Nova speak the greeting; `toolRuns` counts tool injections.
  let greetingSent = false;
  let toolRuns = 0;

  // Idempotent opening: queue sessionStart + promptStart (tools) + the SYSTEM prompt, then open
  // the ONE continuous user-audio content for the whole call. Calling this again is a no-op, so a
  // second start (or any later turn) can never re-send the system prompt or re-trigger the
  // greeting. The greeting therefore happens exactly once per Nova session.
  function sendOpeningSequence(): void {
    if (greetingSent) return;
    greetingSent = true;
    for (const event of buildOpeningSequence({
      promptName,
      systemContentName,
      systemPrompt: opts.systemPrompt,
      voiceId: opts.voiceId,
      tools: opts.tools,
    })) {
      queue.push(event);
    }
    // Open ONE continuous user audio content for the whole call.
    queue.push(contentStartAudioUser({ promptName, contentName: audioContentName }));
  }

  // Send the opening exactly once at session creation.
  sendOpeningSequence();

  // Open the bidirectional stream.
  const output = await opts.invoke({ modelId: opts.modelId, body: queue });

  // 4) Read output events → normalize → hand to the consumer.
  void (async () => {
    try {
      for await (const chunk of output) {
        const bytes = chunk.chunk?.bytes;
        if (!bytes) continue;
        let parsed: unknown;
        try {
          parsed = JSON.parse(new TextDecoder().decode(bytes));
        } catch {
          continue;
        }
        await opts.onOutput(normalizeNovaOutput(parsed));
      }
      finish("stream-complete");
    } catch {
      opts.onError?.();
      finish("stream-error");
    }
  })();

  function finish(reason: string): void {
    if (closed) return;
    closed = true;
    active = false;
    queue.close();
    opts.onClose?.(reason);
  }

  return {
    promptName,
    audioContentName,
    isActive: () => active,
    greetingSent: () => greetingSent,
    toolRunCount: () => toolRuns,
    // Idempotent no-op after creation: never re-sends the opening/system prompt or re-greets.
    start(): void {
      if (!active) return;
      sendOpeningSequence();
    },
    sendAudio(base64: string): void {
      if (!active) return;
      queue.push(audioInput({ promptName, contentName: audioContentName, base64 }));
    },
    sendToolResult(toolUseId: string, resultJson: string): void {
      if (!active) return;
      toolRuns += 1;
      // Inject the tool result into the SAME prompt/session — never a new prompt or session, so a
      // tool result continues the current call and cannot trigger another greeting.
      const contentName = opts.newId("tool");
      queue.push(contentStartToolResult({ promptName, contentName, toolUseId }));
      queue.push(toolResultEvent({ promptName, contentName, content: resultJson }));
      queue.push(contentEnd({ promptName, contentName }));
    },
    async end(): Promise<void> {
      if (!active) return;
      active = false;
      // Close the continuous audio content, then the prompt + session, then the request body.
      queue.push(contentEnd({ promptName, contentName: audioContentName }));
      queue.push(promptEnd({ promptName }));
      queue.push(sessionEnd());
      // Allow the final events to flush before closing the body.
      await Promise.resolve();
      queue.close();
      if (!closed) {
        closed = true;
        opts.onClose?.("client-end");
      }
    },
  };
}
