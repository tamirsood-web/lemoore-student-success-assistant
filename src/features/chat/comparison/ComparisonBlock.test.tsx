// ComparisonBlock component tests.
//
// Verifies rendering, accessibility, and that no invented content appears.

import { render, screen } from "@testing-library/react";
import { ComparisonBlock } from "./ComparisonBlock";
import type { ComparisonBlockData } from "@/types";

const DROP_VS_WITHDRAW: ComparisonBlockData = {
  topic: "Dropping vs. Withdrawing",
  optionA: {
    label: "Dropping",
    explanation: "Dropping before census removes the class from your record.",
  },
  optionB: {
    label: "Withdrawing",
    explanation: "Withdrawing after census results in a W on your transcript.",
  },
  keyDifferences: [
    "Timing: dropping is before census; withdrawing is after.",
    "Transcript: drops don't appear; withdrawals show as W.",
  ],
};

const NO_DIFFERENCES: ComparisonBlockData = {
  topic: "Option A vs. Option B",
  optionA: { label: "Option A", explanation: "Description of option A." },
  optionB: { label: "Option B", explanation: "Description of option B." },
  keyDifferences: [],
};

describe("ComparisonBlock", () => {
  it("renders the topic as a heading", () => {
    render(<ComparisonBlock comparison={DROP_VS_WITHDRAW} />);
    expect(
      screen.getByRole("heading", { name: "Dropping vs. Withdrawing" }),
    ).toBeInTheDocument();
  });

  it("renders both option labels and explanations", () => {
    render(<ComparisonBlock comparison={DROP_VS_WITHDRAW} />);
    expect(screen.getByText("Dropping")).toBeInTheDocument();
    expect(screen.getByText("Withdrawing")).toBeInTheDocument();
    expect(screen.getByText(/removes the class from your record/i)).toBeInTheDocument();
    expect(screen.getByText(/results in a W on your transcript/i)).toBeInTheDocument();
  });

  it("renders the key differences section with a heading", () => {
    render(<ComparisonBlock comparison={DROP_VS_WITHDRAW} />);
    expect(screen.getByRole("heading", { name: /key differences/i })).toBeInTheDocument();
  });

  it("renders each key difference bullet", () => {
    render(<ComparisonBlock comparison={DROP_VS_WITHDRAW} />);
    expect(screen.getByText(/timing: dropping is before census/i)).toBeInTheDocument();
    expect(screen.getByText(/transcript: drops don't appear/i)).toBeInTheDocument();
  });

  it("does not render the key differences section when the list is empty", () => {
    render(<ComparisonBlock comparison={NO_DIFFERENCES} />);
    expect(screen.queryByRole("heading", { name: /key differences/i })).not.toBeInTheDocument();
  });

  it("renders a demo disclaimer", () => {
    render(<ComparisonBlock comparison={DROP_VS_WITHDRAW} />);
    expect(screen.getByText(/sample demo content/i)).toBeInTheDocument();
  });

  it("key-differences section is labelled for accessibility", () => {
    render(<ComparisonBlock comparison={DROP_VS_WITHDRAW} />);
    expect(screen.getByRole("region", { name: /key differences/i })).toBeInTheDocument();
  });
});
