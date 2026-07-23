import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoiceDemo } from "./VoiceDemo";
import type { WebsiteSearchResponse } from "@/types";

// jsdom provides no Web Speech API (SpeechRecognition / speechSynthesis), so these tests run
// the graceful text-only fallback path and never touch a microphone. fetch is always mocked,
// so no test performs a real AWS/network request.

const answered: WebsiteSearchResponse = {
  kind: "answered",
  query: "transcripts",
  answer: "You can order transcripts online [1].",
  citations: [
    {
      id: "src:transcripts",
      title: "Transcripts | Lemoore College",
      excerpt: "Order via Parchment.",
      url: "https://lemoorecollege.edu/resources/transcripts.php",
    },
  ],
  relatedResults: [],
};

const unsupported: WebsiteSearchResponse = {
  kind: "unsupported",
  query: "x",
  message: "I couldn't find a verified answer.",
  relatedResults: [],
};

function mockFetch(response: WebsiteSearchResponse) {
  const fn = vi.fn().mockResolvedValue({ json: async () => response } as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function answerTheCall() {
  const user = userEvent.setup();
  render(<VoiceDemo />);
  await user.click(screen.getByRole("button", { name: "Answer" }));
  return user;
}

describe("VoiceDemo — incoming call", () => {
  it("shows the incoming-call screen with Answer/Decline and the simulation label", () => {
    render(<VoiceDemo />);
    expect(screen.getByText(/incoming call/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Lemoore College Student Support/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Answer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    expect(
      screen.getByText(/Live Nova 2 Sonic demo — simulated call, no phone number involved/i),
    ).toBeInTheDocument();
  });
});

describe("VoiceDemo — answering", () => {
  it("transitions to the active call with greeting, timer, mute, end, and input", async () => {
    await answerTheCall();
    expect(
      screen.getByText(/Thank you for calling Lemoore College Student Support/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("call-timer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mute" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End call" })).toBeInTheDocument();
    expect(screen.getByLabelText(/type a caller message/i)).toBeInTheDocument();
    expect(screen.getByTestId("activity-indicator")).toBeInTheDocument();
  });
});

describe("VoiceDemo — typed caller question + API success", () => {
  it("sends the typed question to /api/search and shows the grounded answer + citations", async () => {
    const fetchMock = mockFetch(answered);
    const user = await answerTheCall();

    await user.type(screen.getByLabelText(/type a caller message/i), "How do I order transcripts?");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("How do I order transcripts?")).toBeInTheDocument();
    expect(await screen.findByText(/order transcripts online/i)).toBeInTheDocument();
    expect(screen.getByText("Transcripts | Lemoore College")).toBeInTheDocument();
    expect(screen.getByText("Sources")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/search",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("VoiceDemo — unsupported response", () => {
  it("renders the honest no-verified-answer state in the transcript", async () => {
    mockFetch(unsupported);
    const user = await answerTheCall();
    await user.type(screen.getByLabelText(/type a caller message/i), "something obscure");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText(/No verified answer/i)).toBeInTheDocument();
  });
});

describe("VoiceDemo — microphone unavailable", () => {
  it("shows the text-only fallback notice and no Speak button when recognition is unsupported", async () => {
    await answerTheCall();
    expect(screen.getByTestId("voice-unavailable-notice")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Speak" })).toBeNull();
    // Typed input remains available.
    expect(screen.getByLabelText(/type a caller message/i)).toBeEnabled();
  });
});

describe("VoiceDemo — mute behavior", () => {
  it("toggles the mute button's pressed state and label", async () => {
    const user = await answerTheCall();
    const mute = screen.getByRole("button", { name: "Mute" });
    expect(mute).toHaveAttribute("aria-pressed", "false");

    await user.click(mute);
    const unmute = screen.getByRole("button", { name: "Unmute" });
    expect(unmute).toHaveAttribute("aria-pressed", "true");

    await user.click(unmute);
    expect(screen.getByRole("button", { name: "Mute" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("VoiceDemo — ending the call and summary", () => {
  it("shows a summary with duration, question count, cited sources, and escalation", async () => {
    mockFetch(answered);
    const user = await answerTheCall();
    await user.type(screen.getByLabelText(/type a caller message/i), "How do I order transcripts?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText(/order transcripts online/i);

    await user.click(screen.getByRole("button", { name: "End call" }));

    expect(screen.getByRole("heading", { name: /Call summary/i })).toBeInTheDocument();
    expect(screen.getByTestId("summary-questions")).toHaveTextContent("1");
    expect(screen.getByTestId("summary-sources")).toHaveTextContent("Transcripts | Lemoore College");
    expect(screen.getByTestId("summary-escalation")).toHaveTextContent("No");
    expect(screen.getByTestId("summary-duration").textContent).toMatch(/^\d+:\d{2}$/);
  });

  it("recommends escalation in the summary when a question was unsupported", async () => {
    mockFetch(unsupported);
    const user = await answerTheCall();
    await user.type(screen.getByLabelText(/type a caller message/i), "obscure");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText(/No verified answer/i);
    await user.click(screen.getByRole("button", { name: "End call" }));
    expect(screen.getByTestId("summary-escalation")).toHaveTextContent("Yes");
  });
});

describe("VoiceDemo — safe error handling", () => {
  it("shows a friendly message and never leaks the internal error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom arn:aws:secret")));
    const user = await answerTheCall();
    await user.type(screen.getByLabelText(/type a caller message/i), "anything");
    await user.click(screen.getByRole("button", { name: "Send" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/having trouble reaching/i);
    expect(alert.textContent ?? "").not.toMatch(/boom|arn:aws|secret/i);
  });
});

describe("VoiceDemo — decline", () => {
  it("declines without placing a call and can return to the incoming screen", async () => {
    const user = userEvent.setup();
    render(<VoiceDemo />);
    await user.click(screen.getByRole("button", { name: "Decline" }));
    expect(screen.getByRole("heading", { name: /Call declined/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Back to incoming call/i }));
    expect(screen.getByRole("button", { name: "Answer" })).toBeInTheDocument();
  });
});
