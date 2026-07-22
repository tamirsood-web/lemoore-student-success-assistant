// Task 8.3 — UI primitive smoke tests.
//
// Verifies the hand-authored accessible primitives: Button (renders, keyboard operable,
// semantically disabled, visible-focus classes), Textarea (labelable + focusable),
// Spinner (accessible status/loading label). Focus behavior is asserted via the intended
// classes and native focusability — not browser-visual screenshots (jsdom can't paint).

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button, Spinner, Textarea } from "./index";

describe("Button", () => {
  it("renders as a native button with an accessible name", () => {
    render(<Button>Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("is keyboard operable (focus + Enter/Space activate)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Send</Button>);

    await user.tab();
    const button = screen.getByRole("button", { name: "Send" });
    expect(button).toHaveFocus();

    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("is semantically disabled when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Send
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Send" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("carries visible focus-ring classes (focus intent, not a screenshot)", () => {
    render(<Button>Send</Button>);
    const button = screen.getByRole("button", { name: "Send" });
    expect(button.className).toContain("focus-visible:ring-2");
    expect(button.className).toContain("focus-visible:ring-accent");
  });

  it("defaults to type=button and honors an explicit type", () => {
    const { rerender } = render(<Button>Default</Button>);
    expect(screen.getByRole("button", { name: "Default" })).toHaveAttribute(
      "type",
      "button",
    );
    rerender(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute(
      "type",
      "submit",
    );
  });
});

describe("Textarea", () => {
  it("is labelable and focusable", async () => {
    const user = userEvent.setup();
    render(
      <>
        <label htmlFor="q">Your question</label>
        <Textarea id="q" />
      </>,
    );
    const textarea = screen.getByLabelText("Your question");
    expect(textarea).toBeInTheDocument();
    await user.click(textarea);
    expect(textarea).toHaveFocus();
    expect(textarea.className).toContain("focus-visible:ring-accent");
  });

  it("accepts multiline typed input", async () => {
    const user = userEvent.setup();
    render(
      <>
        <label htmlFor="q">Your question</label>
        <Textarea id="q" />
      </>,
    );
    const textarea = screen.getByLabelText("Your question");
    await user.type(textarea, "line one{enter}line two");
    expect(textarea).toHaveValue("line one\nline two");
  });
});

describe("Spinner", () => {
  it("exposes an accessible loading status label", () => {
    render(<Spinner />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading…");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("uses a custom label when provided", () => {
    render(<Spinner label="Sending…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Sending…");
  });
});
