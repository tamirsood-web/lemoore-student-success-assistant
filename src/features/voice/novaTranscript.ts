// Pure reducer folding bridge→client messages into the shared transcript + call UI state.
//
// Streaming assistant text (many small chunks per turn) is merged into ONE assistant "voice"
// entry until the turn boundary (a caller line, an interruption, or a tool search). Citations
// attach to the current assistant voice entry so they render inline and feed the call summary.
// No DOM, no network — fully unit-testable.

import type { BridgeMessage, BridgeState } from "@/lib/nova-sonic";
import type { TranscriptEntry, VoiceCitation } from "./voiceState";

export type NovaUiState = {
  readonly transcript: readonly TranscriptEntry[];
  readonly status: BridgeState | "idle";
  readonly escalationRecommended: boolean;
  readonly searching: boolean;
  readonly ended: boolean;
  readonly error: string | null;
  readonly sessionEnding: boolean;
  /** Id of the assistant voice entry currently being appended to (null between turns). */
  readonly currentAssistantId: string | null;
};

export function initialNovaState(): NovaUiState {
  return {
    transcript: [],
    status: "idle",
    escalationRecommended: false,
    searching: false,
    ended: false,
    error: null,
    sessionEnding: false,
    currentAssistantId: null,
  };
}

function mergeCitations(
  existing: readonly VoiceCitation[],
  incoming: readonly VoiceCitation[],
): VoiceCitation[] {
  const seen = new Set(existing.map((c) => c.url));
  const merged = [...existing];
  for (const c of incoming) {
    if (!seen.has(c.url)) {
      seen.add(c.url);
      merged.push(c);
    }
  }
  return merged;
}

/** Fold one bridge message into the UI state. `nextId` mints ids for new assistant entries. */
export function reduceBridge(
  state: NovaUiState,
  message: BridgeMessage,
  nextId: () => string,
): NovaUiState {
  switch (message.t) {
    case "status":
      return { ...state, status: message.state };

    case "transcript": {
      if (message.role === "caller") {
        const text = message.text.trim();
        if (!text) return state;
        return {
          ...state,
          currentAssistantId: null,
          searching: false,
          transcript: [...state.transcript, { id: nextId(), role: "caller", text }],
        };
      }
      // assistant streamed chunk → append to the current voice entry or start a new one.
      const chunk = message.text;
      if (!chunk) return state;
      const current = state.currentAssistantId
        ? state.transcript.find((e) => e.id === state.currentAssistantId)
        : undefined;
      if (current && current.role === "assistant" && "variant" in current && current.variant === "voice") {
        const joined = `${current.text}${current.text && !current.text.endsWith(" ") ? " " : ""}${chunk}`.replace(/\s{2,}/g, " ").trim();
        return {
          ...state,
          transcript: state.transcript.map((e) =>
            e.id === current.id ? { ...current, text: joined } : e,
          ),
        };
      }
      const id = nextId();
      return {
        ...state,
        currentAssistantId: id,
        transcript: [...state.transcript, { id, role: "assistant", variant: "voice", text: chunk, citations: [] }],
      };
    }

    case "citations": {
      const items = message.items.map((c) => ({ title: c.title, url: c.url }));
      // Attach to the current assistant voice entry, or the most recent one, or create it.
      const targetId =
        state.currentAssistantId ??
        [...state.transcript].reverse().find(
          (e) => e.role === "assistant" && "variant" in e && e.variant === "voice",
        )?.id ??
        null;
      if (targetId) {
        return {
          ...state,
          transcript: state.transcript.map((e) =>
            e.id === targetId && e.role === "assistant" && "variant" in e && e.variant === "voice"
              ? { ...e, citations: mergeCitations(e.citations, items) }
              : e,
          ),
        };
      }
      const id = nextId();
      return {
        ...state,
        currentAssistantId: id,
        transcript: [...state.transcript, { id, role: "assistant", variant: "voice", text: "", citations: items }],
      };
    }

    case "tool":
      return {
        ...state,
        searching: message.state === "searching",
        escalationRecommended: state.escalationRecommended || Boolean(message.escalationRecommended),
      };

    case "interruption":
      return { ...state, currentAssistantId: null };

    case "warning":
      return { ...state, sessionEnding: true };

    case "error":
      return { ...state, error: message.message };

    case "ended":
      return { ...state, ended: true, status: "ended" };

    case "audio":
    case "diag":
      return state;
  }
}
