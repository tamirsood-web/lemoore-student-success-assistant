// Task 8.3 — FeedbackControls: exact payload, duplicate-block, success, safe failure.
//
// fetch is mocked locally; no test makes a real network request.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackControls } from "./FeedbackControls";

function okResponse(): Response {
  return { ok: true, json: async () => ({ ok: true }) } as unknown as Response;
}
function errorResponse(): Response {
  return { ok: false, json: async () => ({ ok: false }) } as unknown as Response;
}

/** Parse the JSON body passed to a fetch("/api/feedback", …) call. */
function feedbackBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  const call = fetchMock.mock.calls.find((c) => c[0] === "/api/feedback");
  const init = call?.[1] as RequestInit | undefined;
  return init?.body ? JSON.parse(String(init.body)) : undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FeedbackControls", () => {
  it("sends the exact helpful payload", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    render(<FeedbackControls conversationId="turn-1" />);
    await user.click(screen.getByRole("button", { name: "Helpful" }));

    await waitFor(() =>
      expect(feedbackBody(fetchMock)).toEqual({
        conversationId: "turn-1",
        helpful: true,
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/feedback",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends the exact unhelpful payload", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    render(<FeedbackControls conversationId="turn-2" />);
    await user.click(screen.getByRole("button", { name: "Unhelpful" }));

    await waitFor(() =>
      expect(feedbackBody(fetchMock)).toEqual({
        conversationId: "turn-2",
        helpful: false,
      }),
    );
  });

  it("shows success text and blocks duplicate feedback after success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    render(<FeedbackControls conversationId="turn-3" />);
    await user.click(screen.getByRole("button", { name: "Helpful" }));

    expect(await screen.findByText("Thanks for the feedback.")).toBeInTheDocument();
    // Buttons are gone once feedback succeeded, so it cannot be sent twice.
    expect(screen.queryByRole("button", { name: "Helpful" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks duplicate submissions while one is in flight", async () => {
    const user = userEvent.setup();
    let resolve: ((r: Response) => void) | undefined;
    const pending = new Promise<Response>((r) => {
      resolve = r;
    });
    const fetchMock = vi.fn().mockReturnValue(pending);
    vi.stubGlobal("fetch", fetchMock);

    render(<FeedbackControls conversationId="turn-4" />);
    const helpful = screen.getByRole("button", { name: "Helpful" });
    await user.click(helpful);
    // While submitting, both controls are disabled.
    expect(helpful).toBeDisabled();
    expect(screen.getByRole("button", { name: "Unhelpful" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Unhelpful" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolve?.(okResponse());
    await screen.findByText("Thanks for the feedback.");
  });

  it("keeps the chat usable when feedback fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(errorResponse());
    vi.stubGlobal("fetch", fetchMock);

    render(<FeedbackControls conversationId="turn-5" />);
    await user.click(screen.getByRole("button", { name: "Helpful" }));

    // A calm, non-blocking status is shown and the controls remain available to retry.
    expect(
      await screen.findByText(/couldn't send feedback\. please try again\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Helpful" })).toBeEnabled();
  });
});
