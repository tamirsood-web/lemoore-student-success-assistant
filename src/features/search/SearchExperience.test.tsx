import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchExperience } from "./SearchExperience";

describe("SearchExperience", () => {
  it("runs an initial deep-link query and renders grounded results", async () => {
    render(<SearchExperience initialQuery="financial aid" />);
    const results = await screen.findByRole("region", { name: /search results/i });
    expect(results).toBeInTheDocument();
    // At least one result links to a source.
    expect(within(results).getAllByRole("link").length).toBeGreaterThan(0);
  });

  it("shows popular searches in the idle state and searches on click", async () => {
    const user = userEvent.setup();
    render(<SearchExperience />);

    const popular = screen.getByRole("region", { name: /popular searches/i });
    expect(popular).toBeInTheDocument();

    await user.click(within(popular).getByRole("button", { name: "Counseling" }));
    expect(
      await screen.findByRole("region", { name: /search results/i }),
    ).toBeInTheDocument();
  });

  it("shows an empty state for a query with no matches", async () => {
    const user = userEvent.setup();
    render(<SearchExperience />);
    await user.type(
      screen.getByRole("searchbox"),
      "quantumteadragons",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText(/no results for/i)).toBeInTheDocument();
  });
});
