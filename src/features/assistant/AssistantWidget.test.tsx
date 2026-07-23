// The floating Student Assistant uses the shared /api/search pipeline. This verifies it
// still renders a grounded answer with a working official-source citation. No real network.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, afterEach } from "vitest";
import type { WebsiteSearchResponse } from "@/types";
import { AssistantWidget } from "./AssistantWidget";

const ANSWERED: WebsiteSearchResponse = {
  kind: "answered",
  query: "How do I order my transcript?",
  answer: "You can order transcripts through Parchment. [1]",
  citations: [
    {
      id: "official-transcripts",
      title: "Transcripts | Lemoore College",
      url: "https://lemoorecollege.edu/resources/transcripts.php",
      excerpt: "Standard transcript requests are $7.38 per transcript.",
      department: "Admissions and Records",
    },
  ],
  relatedResults: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AssistantWidget", () => {
  it("opens, sends a question via /api/search, and renders a cited answer", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ANSWERED }) as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AssistantWidget />);

    await user.click(screen.getByRole("button", { name: /open the student assistant/i }));
    const input = screen.getByLabelText(/ask the student assistant/i);
    await user.type(input, "How do I order my transcript?");
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    // Went through the shared pipeline endpoint.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/search", expect.any(Object)));

    // Renders the grounded answer + working official-source link.
    expect(await screen.findByRole("heading", { name: /^answer$/i })).toBeInTheDocument();
    const link = await screen.findByRole("link", { name: /source link/i });
    expect(link).toHaveAttribute("href", "https://lemoorecollege.edu/resources/transcripts.php");
  });
});
