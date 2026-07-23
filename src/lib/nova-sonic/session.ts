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
  sendAudio(base64: string): void;
  sendToolResult(toolUseId: string, resultJson: string): void;
  end(): Promise<void>;
  readonly promptName: string;
  isActive(): boolean;
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

  // 1) Opening sequence: session + prompt (tools) + system content.
  for (const event of buildOpeningSequence({
    promptName,
    systemContentName,
    systemPrompt: opts.systemPrompt,
    voiceId: opts.voiceId,
    tools: opts.tools,
  })) {
    queue.push(event);
  }
  // 2) Open ONE continuous user audio content for the whole call.
  queue.push(contentStartAudioUser({ promptName, contentName: audioContentName }));

  // 3) Open the bidirectional stream.
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
    isActive: () => active,
    sendAudio(base64: string): void {
      if (!active) return;
      queue.push(audioInput({ promptName, contentName: audioContentName, base64 }));
    },
    sendToolResult(toolUseId: string, resultJson: string): void {
      if (!active) return;
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
