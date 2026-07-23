// Nova 2 Sonic bidirectional INPUT event builders (pure).
//
// Produces the exact `{ event: { <type>: {...} } }` envelopes the model expects, in the order
// required for a session: sessionStart → promptStart → (system content) → (user audio content)
// → tool result content (as requested) → contentEnd/promptEnd/sessionEnd. IDs are passed in by
// the caller so tests are deterministic. No I/O; `encodeEvent` renders the JSON to bytes for the
// bidirectional request body.

import { AUDIO_INPUT_SAMPLE_RATE, AUDIO_OUTPUT_SAMPLE_RATE } from "./config";
import type { KbToolSpec } from "./tool";

export type NovaEvent = { readonly event: Record<string, unknown> };

export const DEFAULT_VOICE_ID = "matthew";

export function sessionStart(
  inference: { maxTokens?: number; topP?: number; temperature?: number } = {},
): NovaEvent {
  return {
    event: {
      sessionStart: {
        inferenceConfiguration: {
          maxTokens: inference.maxTokens ?? 1024,
          topP: inference.topP ?? 0.9,
          temperature: inference.temperature ?? 0.7,
        },
      },
    },
  };
}

export function promptStart(input: {
  promptName: string;
  voiceId?: string;
  tools?: readonly KbToolSpec[];
}): NovaEvent {
  return {
    event: {
      promptStart: {
        promptName: input.promptName,
        textOutputConfiguration: { mediaType: "text/plain" },
        audioOutputConfiguration: {
          mediaType: "audio/lpcm",
          sampleRateHertz: AUDIO_OUTPUT_SAMPLE_RATE,
          sampleSizeBits: 16,
          channelCount: 1,
          voiceId: input.voiceId ?? DEFAULT_VOICE_ID,
          encoding: "base64",
          audioType: "SPEECH",
        },
        toolUseOutputConfiguration: { mediaType: "application/json" },
        ...(input.tools && input.tools.length > 0
          ? { toolConfiguration: { tools: input.tools } }
          : {}),
      },
    },
  };
}

export function contentStartText(input: {
  promptName: string;
  contentName: string;
  role: "SYSTEM" | "USER";
}): NovaEvent {
  return {
    event: {
      contentStart: {
        promptName: input.promptName,
        contentName: input.contentName,
        type: "TEXT",
        role: input.role,
        textInputConfiguration: { mediaType: "text/plain" },
      },
    },
  };
}

export function textInput(input: {
  promptName: string;
  contentName: string;
  content: string;
}): NovaEvent {
  return {
    event: {
      textInput: {
        promptName: input.promptName,
        contentName: input.contentName,
        content: input.content,
      },
    },
  };
}

export function contentStartAudioUser(input: {
  promptName: string;
  contentName: string;
}): NovaEvent {
  return {
    event: {
      contentStart: {
        promptName: input.promptName,
        contentName: input.contentName,
        type: "AUDIO",
        role: "USER",
        audioInputConfiguration: {
          mediaType: "audio/lpcm",
          sampleRateHertz: AUDIO_INPUT_SAMPLE_RATE,
          sampleSizeBits: 16,
          channelCount: 1,
          audioType: "SPEECH",
          encoding: "base64",
        },
      },
    },
  };
}

export function audioInput(input: {
  promptName: string;
  contentName: string;
  base64: string;
}): NovaEvent {
  return {
    event: {
      audioInput: {
        promptName: input.promptName,
        contentName: input.contentName,
        content: input.base64,
      },
    },
  };
}

export function contentStartToolResult(input: {
  promptName: string;
  contentName: string;
  toolUseId: string;
}): NovaEvent {
  return {
    event: {
      contentStart: {
        promptName: input.promptName,
        contentName: input.contentName,
        type: "TOOL",
        role: "TOOL",
        toolResultInputConfiguration: {
          toolUseId: input.toolUseId,
          type: "TEXT",
          textInputConfiguration: { mediaType: "text/plain" },
        },
      },
    },
  };
}

export function toolResult(input: {
  promptName: string;
  contentName: string;
  content: string;
}): NovaEvent {
  return {
    event: {
      toolResult: {
        promptName: input.promptName,
        contentName: input.contentName,
        content: input.content,
      },
    },
  };
}

export function contentEnd(input: { promptName: string; contentName: string }): NovaEvent {
  return { event: { contentEnd: { promptName: input.promptName, contentName: input.contentName } } };
}

export function promptEnd(input: { promptName: string }): NovaEvent {
  return { event: { promptEnd: { promptName: input.promptName } } };
}

export function sessionEnd(): NovaEvent {
  return { event: { sessionEnd: {} } };
}

/**
 * The ordered opening sequence for a call: session + prompt (with tools) + the system content
 * block. Audio user turns are streamed separately after this.
 */
export function buildOpeningSequence(input: {
  promptName: string;
  systemContentName: string;
  systemPrompt: string;
  voiceId?: string;
  tools?: readonly KbToolSpec[];
}): NovaEvent[] {
  return [
    sessionStart(),
    promptStart({ promptName: input.promptName, voiceId: input.voiceId, tools: input.tools }),
    contentStartText({ promptName: input.promptName, contentName: input.systemContentName, role: "SYSTEM" }),
    textInput({ promptName: input.promptName, contentName: input.systemContentName, content: input.systemPrompt }),
    contentEnd({ promptName: input.promptName, contentName: input.systemContentName }),
  ];
}

/** Encode an event as UTF-8 bytes for the bidirectional request body. */
export function encodeEvent(event: NovaEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event));
}
