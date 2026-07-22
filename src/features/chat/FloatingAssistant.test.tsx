import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FloatingAssistant } from "./FloatingAssistant";

describe("FloatingAssistant", () => {
  it("starts collapsed: the toggle is present and the chat input is not mounted", () => {
    render(<FloatingAssistant maxInputChars={2000} />);
    const toggle = screen.getByRole("button", { name: /open ai assistant/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Your question")).not.toBeInTheDocument();
  });

  it("expands to reveal the reused chat UI, then collapses again", async () => {
    const user = userEvent.setup();
    render(<FloatingAssistant maxInputChars={2000} />);

    await user.click(screen.getByRole("button", { name: /open ai assistant/i }));

    const toggle = screen.getByRole("button", { name: /close ai assistant/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // The existing ChatContainer (and its input) is now mounted, unchanged.
    expect(screen.getByLabelText("Your question")).toBeInTheDocument();

    await user.click(toggle);
    expect(
      screen.getByRole("button", { name: /open ai assistant/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on the Escape key", async () => {
    const user = userEvent.setup();
    render(<FloatingAssistant maxInputChars={2000} />);
    await user.click(screen.getByRole("button", { name: /open ai assistant/i }));
    expect(screen.getByLabelText("Your question")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("button", { name: /open ai assistant/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
