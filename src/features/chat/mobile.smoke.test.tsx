// Task 8.3 — Responsive / mobile-layout smoke tests.
//
// Renders the public chat at a phone-sized viewport and at a desktop viewport, asserting
// that key controls stay present and reachable and that content uses overflow-safe
// (wrapping) class intent. Per the task, this checks semantic structure and responsive
// class intent — NOT pixel geometry, which jsdom cannot compute.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AssistantResponse } from "@/types";
import PublicLayout from "@/app/(public)/layout";
import { ChatContainer } from "./ChatContainer";

const PHONE_WIDTH = 375;
const DESKTOP_WIDTH = 1280;

function setViewport(width: number): void {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

const LONG_TITLE =
  "Admissions & Records — Comprehensive Office Hours, Contacts, Enrollment Steps, and Frequently Asked Questions (Sample Demo Source Title)";

const LONG_ANSWER =
  "TheAdmissionsAndRecordsOfficeProvidesEnrollmentAssistanceRegistrationSupportTranscriptRequestsDegreePostingReviewsAndGeneralGuidanceForProspectiveAndCurrentStudentsThroughoutEachTerm sample demo content.";

const GROUNDED_LONG: AssistantResponse = {
  kind: "grounded",
  answer: LONG_ANSWER,
  confidence: "high",
  citations: [
    {
      sourceId: "src_admissions_office_hours",
      title: LONG_TITLE,
      uri: "https://demo.lemoore-college.example/admissions/hours",
      excerpt: "Sample office hours: Monday–Friday, 8:00 AM–4:30 PM.",
    },
  ],
  escalationRecommended: false,
  suggestedQuestions: [],
};

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setViewport(1024); // jsdom default
});

describe("public chat — mobile viewport smoke", () => {
  beforeEach(() => {
    setViewport(PHONE_WIDTH);
  });

  it("keeps the header, input, and submit control present and reachable on a phone", async () => {
    render(
      <PublicLayout>
        <ChatContainer maxInputChars={2000} />
      </PublicLayout>,
    );

    // Page landmarks are present.
    expect(
      screen.getByRole("heading", { name: /lemoore student success assistant/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    // Key controls are present and operable.
    const input = screen.getByLabelText("Your question");
    expect(input).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(input);
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("uses a mobile-first, overflow-safe reading container", () => {
    const { container } = render(
      <PublicLayout>
        <ChatContainer maxInputChars={2000} />
      </PublicLayout>,
    );
    // The layout constrains the reading measure and pads for small screens.
    const shell = container.querySelector(".max-w-3xl");
    expect(shell).not.toBeNull();
    expect(shell?.className).toContain("mx-auto");
    expect(shell?.className).toContain("px-4");
  });

  it("wraps long citation titles and long answers with overflow-safe classes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(GROUNDED_LONG)));
    render(
      <PublicLayout>
        <ChatContainer maxInputChars={2000} />
      </PublicLayout>,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Your question"), "office hours?");
    await user.click(screen.getByRole("button", { name: "Send" }));

    // Long answer text wraps rather than forcing horizontal scroll.
    const answer = await screen.findByText(LONG_ANSWER);
    expect(answer.className).toContain("break-words");

    // Long citation title wraps too.
    const sources = screen.getByRole("region", { name: /sources/i });
    const link = within(sources).getByRole("link", { name: LONG_TITLE });
    expect(link.className).toContain("break-words");
  });
});

describe("public chat — desktop viewport smoke", () => {
  beforeEach(() => {
    setViewport(DESKTOP_WIDTH);
  });

  it("keeps the same controls present at a desktop width", () => {
    render(
      <PublicLayout>
        <ChatContainer maxInputChars={2000} />
      </PublicLayout>,
    );
    expect(screen.getByLabelText("Your question")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    // The example-question chips are reachable in the empty state.
    expect(
      screen.getByRole("region", { name: /example questions/i }),
    ).toBeInTheDocument();
  });
});
