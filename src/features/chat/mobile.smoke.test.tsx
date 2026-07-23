// Responsive / mobile-layout smoke tests for the reproduced Lemoore College site shell.
//
// Renders the public layout at a phone-sized viewport and at a desktop viewport, asserting
// that the site landmarks, the site search control, the mobile menu, the floating Student
// Assistant, and the prototype disclosure stay present and reachable. This checks semantic
// structure and responsive intent — NOT pixel geometry, which jsdom cannot compute.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import PublicLayout from "@/app/(public)/layout";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const PHONE_WIDTH = 375;
const DESKTOP_WIDTH = 1280;

function setViewport(width: number): void {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

afterEach(() => {
  vi.unstubAllGlobals();
  setViewport(1024);
});

describe("Lemoore site shell — mobile viewport smoke", () => {
  beforeEach(() => setViewport(PHONE_WIDTH));

  it("keeps the header, main, footer, search, and assistant reachable on a phone", () => {
    render(
      <PublicLayout>
        <div>Page content</div>
      </PublicLayout>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    // Site search + floating assistant are the working improvements.
    expect(screen.getByRole("button", { name: /open site search/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open the student assistant/i }),
    ).toBeInTheDocument();

    // Prototype disclosure is always visible.
    expect(
      screen.getByText(/prototype demo — not the official lemoore college website/i),
    ).toBeInTheDocument();
  });

  it("opens the mobile menu and exposes the main navigation", async () => {
    const user = userEvent.setup();
    render(
      <PublicLayout>
        <div>Page content</div>
      </PublicLayout>,
    );

    const toggle = screen.getByRole("button", { name: /open menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: /close menu/i })).toBeInTheDocument();

    const mobileNav = screen.getByRole("navigation", { name: /mobile main/i });
    expect(mobileNav).toBeInTheDocument();
  });
});

describe("Lemoore site shell — desktop viewport smoke", () => {
  beforeEach(() => setViewport(DESKTOP_WIDTH));

  it("keeps the search control and main navigation present at desktop width", () => {
    render(
      <PublicLayout>
        <div>Page content</div>
      </PublicLayout>,
    );
    expect(screen.getByRole("button", { name: /open site search/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /^main$/i })).toBeInTheDocument();
  });
});
