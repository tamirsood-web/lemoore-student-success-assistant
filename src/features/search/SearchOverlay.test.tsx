// SearchOverlay accessibility + behavior: keyboard submit, focus management, Escape close,
// grounded-answer rendering with a working official-source link. No real network is made.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, afterEach } from "vitest";
import type { WebsiteSearchResponse } from "@/types";
import { SearchOverlay } from "./SearchOverlay";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const ANSWERED: WebsiteSearchResponse = {
  kind: "answered",
  query: "How do I order my transcript?",
  answer: "Students receive two free transcript requests in their lifetime. [1]",
  citations: [
    {
      id: "official-transcripts",
      title: "Transcripts | Lemoore College",
      url: "https://lemoorecollege.edu/resources/transcripts.php",
      excerpt: "Students receive two free transcript requests in their lifetime.",
      department: "Admissions and Records",
    },
  ],
  relatedResults: [],
};

function stubFetch(body: WebsiteSearchResponse) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => body }) as unknown as Response),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SearchOverlay", () => {
  it("renders as a labelled modal dialog and focuses the search field on open", async () => {
    stubFetch(ANSWERED);
    render(<SearchOverlay open onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: /search lemoore college/i });
    expect(dialog).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText(/ask a question or search/i)).toHaveFocus(),
    );
  });

  it("shows example questions in the idle state", () => {
    stubFetch(ANSWERED);
    render(<SearchOverlay open onClose={() => {}} />);
    expect(
      screen.getByRole("button", { name: /how do i order my official transcript/i }),
    ).toBeInTheDocument();
  });

  it("submits with Enter and renders a grounded answer + working source link", async () => {
    stubFetch(ANSWERED);
    const user = userEvent.setup();
    render(<SearchOverlay open onClose={() => {}} />);

    const input = screen.getByLabelText(/ask a question or search/i);
    await user.type(input, "How do I order my transcript?{Enter}");

    expect(
      await screen.findByRole("heading", { name: /^answer$/i }),
    ).toBeInTheDocument();
    const link = await screen.findByRole("link", { name: /open official source/i });
    expect(link).toHaveAttribute("href", "https://lemoorecollege.edu/resources/transcripts.php");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("closes on Escape", async () => {
    stubFetch(ANSWERED);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<SearchOverlay open onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
