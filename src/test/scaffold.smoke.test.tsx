import { render, screen } from "@testing-library/react";

// Group 1 scaffolding smoke test: verifies the Vitest + React Testing Library +
// jsdom + jest-dom harness is wired up. Feature tests arrive in Group 8.
describe("test harness", () => {
  it("renders a React element and applies jest-dom matchers", () => {
    render(<h1>Lemoore Student Success Assistant</h1>);
    expect(
      screen.getByRole("heading", { name: /lemoore student success assistant/i }),
    ).toBeInTheDocument();
  });
});
