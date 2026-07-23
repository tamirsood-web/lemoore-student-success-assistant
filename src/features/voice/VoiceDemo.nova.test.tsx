import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BridgeMessage } from "@/lib/nova-sonic";
import type { NovaHandlers } from "./useNovaSonic";

// Mock the Nova transport hook so the component exercises the REAL voice-mode wiring (reducer,
// transcript, citations, summary) with NO WebSocket, mic, audio, or AWS. The fake drives bridge
// messages exactly as the live bridge would.
const box: { handlers: NovaHandlers | null } = { handlers: null };
const drive = (m: BridgeMessage) => box.handlers?.onMessage(m);

vi.mock("./useNovaSonic", () => ({
  useNovaSonic: () => ({
    available: true,
    connect: async (h: NovaHandlers) => {
      box.handlers = h;
      h.onMessage({ t: "status", state: "listening" });
      // Nova greets first (as in the live session).
      h.onMessage({ t: "transcript", role: "assistant", text: "Thank you for calling Lemoore College Student Support." });
    },
    sendText: (text: string) => {
      drive({ t: "transcript", role: "caller", text });
      drive({ t: "tool", state: "searching" });
      drive({ t: "transcript", role: "assistant", text: "You can order transcripts online." });
      drive({ t: "citations", items: [{ title: "Transcripts | Lemoore College", url: "https://lemoorecollege.edu/resources/transcripts.php" }] });
      drive({ t: "tool", state: "done", escalationRecommended: false });
    },
    setMuted: vi.fn(),
    end: () => drive({ t: "ended", reason: "client-end" }),
  }),
}));

beforeEach(() => {
  box.handlers = null;
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

import { VoiceDemo as VoiceDemoLazy } from "./VoiceDemo";

describe("VoiceDemo — live Nova voice mode (mocked transport)", () => {
  it("connects, shows the Nova greeting, and reports a live status (not the text-only fallback)", async () => {
    const user = userEvent.setup();
    render(<VoiceDemoLazy />);
    await user.click(screen.getByRole("button", { name: "Answer" }));
    expect(
      await screen.findByText(/Thank you for calling Lemoore College Student Support/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("voice-unavailable-notice")).toBeNull();
  });

  it("sends typed input into the SAME Nova conversation and renders the grounded answer + citations", async () => {
    const user = userEvent.setup();
    render(<VoiceDemoLazy />);
    await user.click(screen.getByRole("button", { name: "Answer" }));
    await user.type(screen.getByLabelText(/type a caller message/i), "How do I order transcripts?");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("How do I order transcripts?")).toBeInTheDocument();
    expect(screen.getByText("You can order transcripts online.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transcripts | Lemoore College" })).toHaveAttribute(
      "href",
      "https://lemoorecollege.edu/resources/transcripts.php",
    );
  });

  it("ends the call and shows a summary with the cited source and 1 question", async () => {
    const user = userEvent.setup();
    render(<VoiceDemoLazy />);
    await user.click(screen.getByRole("button", { name: "Answer" }));
    await user.type(screen.getByLabelText(/type a caller message/i), "How do I order transcripts?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("You can order transcripts online.");
    await user.click(screen.getByRole("button", { name: "End call" }));

    expect(screen.getByRole("heading", { name: /Call summary/i })).toBeInTheDocument();
    expect(screen.getByTestId("summary-questions")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-sources")).toHaveTextContent("Transcripts | Lemoore College");
    expect(screen.getByTestId("summary-escalation")).toHaveTextContent("No");
  });
});
