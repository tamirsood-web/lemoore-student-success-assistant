import { describe, it, expect } from "vitest";
import { initialNovaState, reduceBridge, type NovaUiState } from "./novaTranscript";
import type { BridgeMessage } from "@/lib/nova-sonic";

let counter = 0;
const nextId = () => `n${(counter += 1)}`;

function apply(messages: BridgeMessage[]): NovaUiState {
  return messages.reduce((state, m) => reduceBridge(state, m, nextId), initialNovaState());
}

describe("reduceBridge", () => {
  it("adds a caller line and starts a fresh assistant turn afterwards", () => {
    const state = apply([
      { t: "transcript", role: "caller", text: "How do I order transcripts?" },
    ]);
    expect(state.transcript).toHaveLength(1);
    expect(state.transcript[0]).toMatchObject({ role: "caller", text: "How do I order transcripts?" });
    expect(state.currentAssistantId).toBeNull();
  });

  it("merges consecutive assistant chunks into one voice entry", () => {
    const state = apply([
      { t: "transcript", role: "assistant", text: "You can order" },
      { t: "transcript", role: "assistant", text: "transcripts online." },
    ]);
    const voice = state.transcript.filter((e) => "variant" in e && e.variant === "voice");
    expect(voice).toHaveLength(1);
    expect((voice[0] as { text: string }).text).toBe("You can order transcripts online.");
  });

  it("attaches citations to the current assistant voice entry", () => {
    const state = apply([
      { t: "transcript", role: "assistant", text: "Order via the office." },
      { t: "citations", items: [{ title: "Transcripts | Lemoore College", url: "https://lemoorecollege.edu/resources/transcripts.php" }] },
    ]);
    const voice = state.transcript.find((e) => "variant" in e && e.variant === "voice") as {
      citations: readonly unknown[];
    };
    expect(voice.citations).toHaveLength(1);
  });

  it("tracks escalation from a tool-done message", () => {
    const state = apply([{ t: "tool", state: "done", escalationRecommended: true }]);
    expect(state.escalationRecommended).toBe(true);
  });

  it("sets searching on tool searching and clears it on a caller turn", () => {
    let s = reduceBridge(initialNovaState(), { t: "tool", state: "searching" }, nextId);
    expect(s.searching).toBe(true);
    s = reduceBridge(s, { t: "transcript", role: "caller", text: "next" }, nextId);
    expect(s.searching).toBe(false);
  });

  it("interruption ends the current assistant turn (keeps text spoken so far)", () => {
    const state = apply([
      { t: "transcript", role: "assistant", text: "Partial answer" },
      { t: "interruption" },
      { t: "transcript", role: "assistant", text: "New turn" },
    ]);
    const voice = state.transcript.filter((e) => "variant" in e && e.variant === "voice");
    expect(voice).toHaveLength(2); // interruption forced a new entry
  });

  it("records ended + error safely", () => {
    expect(apply([{ t: "ended", reason: "client-end" }]).ended).toBe(true);
    expect(apply([{ t: "error", message: "unavailable" }]).error).toBe("unavailable");
  });

  it("session-ending warning is surfaced", () => {
    expect(apply([{ t: "warning", kind: "session-ending", secondsLeft: 30 }]).sessionEnding).toBe(true);
  });
});
