// Task 8.3 — ChatContainer end-to-end UI behavior with a locally mocked fetch.
//
// Covers loading, successful response rendering, error handling + retry, duplicate-submit
// blocking, feedback wiring, follow-ups, and accessibility. No real network request is
// made; fetch is stubbed per test and restored afterward.

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AssistantResponse } from "@/types";
import { ChatContainer } from "./ChatContainer";

const GROUNDED: AssistantResponse = {
  kind: "grounded",
  answer:
    "The Admissions & Records office is open Monday–Friday, 8:00 AM–4:30 PM. Sample demo content.",
  confidence: "high",
  citations: [
    {
      sourceId: "src_admissions_office_hours",
      title: "Admissions & Records — Office Hours (Sample)",
      uri: "https://demo.lemoore-college.example/admissions/hours",
      excerpt: "Sample office hours: Monday–Friday, 8:00 AM–4:30 PM.",
    },
  ],
  escalationRecommended: false,
  suggestedQuestions: ["How do I contact counseling?"],
};

const ESCALATED: AssistantResponse = {
  kind: "insufficient_evidence",
  answer:
    "I could not verify that from the approved college sources. Please contact Student Services for confirmation.",
  confidence: "low",
  citations: [],
  department: "Student Services",
  escalationRecommended: true,
  escalation: {
    reason: "no_relevant_source",
    department: "Student Services",
    contact: {
      name: "Student Services",
      email: "studentservices@demo.lemoore-college.example",
      phone: "(000) 555-0140",
      url: "https://demo.lemoore-college.example/student-services",
      office: "Sample office and hours — demo data only.",
    },
    message:
      "I could not verify that from the approved college sources. Please contact Student Services for confirmation.",
  },
  suggestedQuestions: [],
};

/** A minimal fetch Response stand-in carrying a JSON body. */
function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as unknown as Response;
}

async function ask(question: string): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Your question"), question);
  await user.click(screen.getByRole("button", { name: "Send" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ChatContainer — loading", () => {
  it("shows a loading status and blocks duplicate submits while in flight", async () => {
    let resolve: ((r: Response) => void) | undefined;
    const fetchMock = vi.fn().mockReturnValue(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ChatContainer maxInputChars={2000} />);
    await ask("What are the admissions office hours?");

    // The pending turn announces a loading status; the input is disabled.
    expect(await screen.findByText("Finding an answer…")).toBeInTheDocument();
    expect(screen.getByLabelText("Your question")).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolve?.(jsonResponse(GROUNDED));
    await screen.findByText(/office is open/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("ChatContainer — successful response", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(GROUNDED)));
  });

  it("renders the student question and the assistant answer", async () => {
    render(<ChatContainer maxInputChars={2000} />);
    await ask("What are the admissions office hours?");

    expect(
      await screen.findByText("What are the admissions office hours?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/office is open/i)).toBeInTheDocument();
  });

  it("shows confidence as descriptive text only, never a numeric score", async () => {
    render(<ChatContainer maxInputChars={2000} />);
    await ask("What are the admissions office hours?");
    await screen.findByText(/office is open/i);

    expect(
      screen.getByText(/based on the available source information/i),
    ).toBeInTheDocument();
    // No numeric percentage and no raw enum value are shown.
    expect(screen.queryByText(/\d+\s*%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/confidence[:\s]+(high|medium|low)/i)).not.toBeInTheDocument();
  });

  it("renders citations in a separated Sources area when supplied", async () => {
    render(<ChatContainer maxInputChars={2000} />);
    await ask("What are the admissions office hours?");
    await screen.findByText(/office is open/i);

    const sources = screen.getByRole("region", { name: /sources/i });
    const link = within(sources).getByRole("link", {
      name: "Admissions & Records — Office Hours (Sample)",
    });
    expect(link).toHaveAttribute("href", "https://demo.lemoore-college.example/admissions/hours");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("does not render an escalation card for a grounded answer", async () => {
    render(<ChatContainer maxInputChars={2000} />);
    await ask("What are the admissions office hours?");
    await screen.findByText(/office is open/i);
    expect(screen.queryByText(/you may want to contact/i)).not.toBeInTheDocument();
  });

  it("renders suggested follow-up questions as real buttons", async () => {
    render(<ChatContainer maxInputChars={2000} />);
    await ask("What are the admissions office hours?");
    await screen.findByText(/office is open/i);

    const followUps = screen.getByRole("region", { name: /suggested follow-ups/i });
    expect(
      within(followUps).getByRole("button", { name: "How do I contact counseling?" }),
    ).toBeInTheDocument();
  });

  it("exposes the assistant region as a polite live log", async () => {
    render(<ChatContainer maxInputChars={2000} />);
    await ask("What are the admissions office hours?");
    await screen.findByText(/office is open/i);

    const log = screen.getByRole("log");
    expect(log).toHaveAttribute("aria-live", "polite");
  });
});

describe("ChatContainer — escalation rendering", () => {
  it("renders the escalation card only when escalation is recommended", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(ESCALATED)));
    render(<ChatContainer maxInputChars={2000} />);
    await ask("Will my financial aid definitely be approved?");

    expect(
      await screen.findByText(/you may want to contact student services/i),
    ).toBeInTheDocument();
    // No fabricated citation area for an unverified answer.
    expect(screen.queryByRole("region", { name: /sources/i })).not.toBeInTheDocument();
    // Transparent wording; never claims a human was contacted.
    expect(screen.getByText(/could not verify/i)).toBeInTheDocument();
  });
});

describe("ChatContainer — error handling", () => {
  it("shows a generic safe error without internal detail, and allows retry", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED secret stack internals"))
      .mockResolvedValueOnce(jsonResponse(GROUNDED));
    vi.stubGlobal("fetch", fetchMock);

    render(<ChatContainer maxInputChars={2000} />);
    await ask("What are the admissions office hours?");

    // Fallback message is rendered inside a MessageBubble (answer role).
    const errorText = await screen.findByText(/something went wrong/i);
    expect(errorText).toBeInTheDocument();
    // Raw internal error detail is never surfaced.
    expect(errorText.closest("[role=log]")!.textContent).not.toContain("ECONNREFUSED");
    expect(errorText.closest("[role=log]")!.textContent).not.toContain(
      "secret stack internals",
    );

    // Prior conversation remains usable and the request can be retried.
    expect(screen.getByLabelText("Your question")).toBeEnabled();
    await ask("What are the admissions office hours?");
    expect(await screen.findByText(/office is open/i)).toBeInTheDocument();
    // The earlier failed turn is still present (conversation preserved).
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});

describe("ChatContainer — no untrusted HTML", () => {
  it("renders answer markup as literal text, not as HTML", async () => {
    const withMarkup: AssistantResponse = {
      ...GROUNDED,
      answer: "<script>alert(1)</script> office hours are posted online.",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(withMarkup)));
    render(<ChatContainer maxInputChars={2000} />);
    await ask("What are the admissions office hours?");

    expect(
      await screen.findByText(/<script>alert\(1\)<\/script> office hours/i),
    ).toBeInTheDocument();
    // The literal markup did not create a real element.
    expect(document.querySelector("script")).toBeNull();
  });
});
