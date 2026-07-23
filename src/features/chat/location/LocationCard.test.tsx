// LocationCard component tests.
//
// Verifies rendering, accessibility, safe-link behaviour, and the map embed toggle.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocationCard } from "./LocationCard";
import type { LocationCardData } from "@/types";

const FULL_LOCATION: LocationCardData = {
  name: "Admissions & Records",
  building: "Administration Building, Room 101 (sample)",
  hours: "Monday–Friday, 8:00 AM–4:30 PM (sample hours)",
  phone: "(000) 555-0100",
  email: "admissions@demo.lemoore-college.example",
  url: "https://demo.lemoore-college.example/admissions",
  mapUrl: "https://lemoorecollege.edu/map/",
};

const MINIMAL_LOCATION: LocationCardData = {
  name: "Student Services",
};

describe("LocationCard", () => {
  it("renders the department name as a heading", () => {
    render(<LocationCard location={FULL_LOCATION} />);
    expect(screen.getByRole("heading", { name: "Admissions & Records" })).toBeInTheDocument();
  });

  it("renders building, hours, phone, email, and website fields", () => {
    render(<LocationCard location={FULL_LOCATION} />);
    expect(screen.getByText(/Administration Building/)).toBeInTheDocument();
    expect(screen.getByText(/Monday–Friday/)).toBeInTheDocument();
    expect(screen.getByText("(000) 555-0100")).toBeInTheDocument();
    expect(screen.getByText("admissions@demo.lemoore-college.example")).toBeInTheDocument();
  });

  it("renders an 'Open full map' link pointing to the campus map URL", () => {
    render(<LocationCard location={FULL_LOCATION} />);
    const mapLink = screen.getByRole("link", { name: /open full campus map/i });
    expect(mapLink).toHaveAttribute("href", "https://lemoorecollege.edu/map/");
    expect(mapLink).toHaveAttribute("target", "_blank");
    expect(mapLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows a 'Show map' toggle button when mapUrl is present", () => {
    render(<LocationCard location={FULL_LOCATION} />);
    expect(
      screen.getByRole("button", { name: /show map/i }),
    ).toBeInTheDocument();
  });

  it("map iframe is hidden by default", () => {
    render(<LocationCard location={FULL_LOCATION} />);
    expect(screen.queryByTitle(/campus map/i)).not.toBeInTheDocument();
  });

  it("clicking 'Show map' reveals the iframe and changes button label", async () => {
    const user = userEvent.setup();
    render(<LocationCard location={FULL_LOCATION} />);
    const toggle = screen.getByRole("button", { name: /show map/i });
    await user.click(toggle);
    // iframe should now be present
    expect(screen.getByTitle(/campus map/i)).toBeInTheDocument();
    // button label should flip
    expect(screen.getByRole("button", { name: /hide map/i })).toBeInTheDocument();
    // aria-expanded should be true
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("clicking 'Hide map' collapses the iframe again", async () => {
    const user = userEvent.setup();
    render(<LocationCard location={FULL_LOCATION} />);
    const toggle = screen.getByRole("button", { name: /show map/i });
    await user.click(toggle); // open
    await user.click(toggle); // close
    expect(screen.queryByTitle(/campus map/i)).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("iframe src points to the campus map URL", async () => {
    const user = userEvent.setup();
    render(<LocationCard location={FULL_LOCATION} />);
    await user.click(screen.getByRole("button", { name: /show map/i }));
    const iframe = screen.getByTitle(/campus map/i);
    expect(iframe).toHaveAttribute("src", "https://lemoorecollege.edu/map/");
  });

  it("map embed area has a disclaimer label", async () => {
    const user = userEvent.setup();
    render(<LocationCard location={FULL_LOCATION} />);
    await user.click(screen.getByRole("button", { name: /show map/i }));
    expect(screen.getByText(/campus map preview.*sample demo only/i)).toBeInTheDocument();
  });

  it("renders the phone number as plain text when the area code is reserved (000)", () => {
    render(<LocationCard location={FULL_LOCATION} />);
    expect(screen.getByText("(000) 555-0100")).toBeInTheDocument();
    const allLinks = screen.getAllByRole("link");
    for (const link of allLinks) {
      expect(link).not.toHaveAttribute("href", expect.stringMatching(/^tel:/));
    }
  });

  it("email link uses mailto: href", () => {
    render(<LocationCard location={FULL_LOCATION} />);
    const emailLink = screen.getByRole("link", {
      name: "admissions@demo.lemoore-college.example",
    });
    expect(emailLink).toHaveAttribute(
      "href",
      "mailto:admissions@demo.lemoore-college.example",
    );
  });

  it("renders a demo disclaimer", () => {
    render(<LocationCard location={FULL_LOCATION} />);
    expect(screen.getByText(/sample demo location/i)).toBeInTheDocument();
  });

  it("renders with only a name (minimal data) without crashing", () => {
    render(<LocationCard location={MINIMAL_LOCATION} />);
    expect(screen.getByRole("heading", { name: "Student Services" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open full.*map/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show map/i })).not.toBeInTheDocument();
  });

  it("does not render a map toggle when mapUrl is absent", () => {
    render(<LocationCard location={{ ...FULL_LOCATION, mapUrl: undefined }} />);
    expect(screen.queryByRole("button", { name: /show map/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open full.*map/i })).not.toBeInTheDocument();
  });

  it("does not render a phone link for a reserved 000 number", () => {
    render(<LocationCard location={{ ...FULL_LOCATION, phone: "(000) 555-0100" }} />);
    const allLinks = screen.getAllByRole("link");
    for (const link of allLinks) {
      expect(link).not.toHaveAttribute("href", expect.stringMatching(/^tel:/));
    }
  });
});
