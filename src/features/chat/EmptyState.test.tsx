// Task 8.3 — EmptyState: trust framing, example questions, sensitive-data warning.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("shows trust-framing about grounded, local sources", () => {
    render(<EmptyState onSelectExample={vi.fn()} disabled={false} />);
    expect(
      screen.getByRole("heading", { name: /ask a question about lemoore college/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/sample, local sources/i)).toBeInTheDocument();
    expect(
      screen.getByText(/official department to contact/i),
    ).toBeInTheDocument();
  });

  it("shows a visible sensitive-data warning", () => {
    render(<EmptyState onSelectExample={vi.fn()} disabled={false} />);
    expect(
      screen.getByText(/don't enter personal details like id numbers, ssns, or passwords/i),
    ).toBeInTheDocument();
  });

  it("renders supported example questions as real buttons", () => {
    render(<EmptyState onSelectExample={vi.fn()} disabled={false} />);
    const group = screen.getByRole("region", { name: /example questions/i });
    expect(group).toBeInTheDocument();
    const chips = screen.getAllByRole("button");
    expect(chips.length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "What are the admissions office hours?" }),
    ).toBeInTheDocument();
  });

  it("submits a question through the chat flow when a chip is chosen", async () => {
    const user = userEvent.setup();
    const onSelectExample = vi.fn();
    render(<EmptyState onSelectExample={onSelectExample} disabled={false} />);
    await user.click(
      screen.getByRole("button", { name: "How can I contact financial aid?" }),
    );
    expect(onSelectExample).toHaveBeenCalledWith("How can I contact financial aid?");
  });

  it("disables chips while a request is pending", () => {
    render(<EmptyState onSelectExample={vi.fn()} disabled />);
    for (const chip of screen.getAllByRole("button")) {
      expect(chip).toBeDisabled();
    }
  });
});
