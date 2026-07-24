import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StructuredAnswer } from "./StructuredAnswer";

describe("StructuredAnswer — UI rendering", () => {
  it("renders separate paragraphs for \\n\\n separated text", () => {
    const text = "First paragraph.\n\nSecond paragraph.";
    const { container } = render(<StructuredAnswer text={text} />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0]?.textContent).toContain("First paragraph.");
    expect(paragraphs[1]?.textContent).toContain("Second paragraph.");
  });

  it("renders bullet lines as <ul><li> elements", () => {
    const text = "Here is info.\n\n• First item\n• Second item\n• Third item";
    const { container } = render(<StructuredAnswer text={text} />);
    const ul = container.querySelector("ul");
    expect(ul).not.toBeNull();
    const items = ul!.querySelectorAll("li");
    expect(items.length).toBe(3);
    expect(items[0]?.textContent).toContain("First item");
    expect(items[1]?.textContent).toContain("Second item");
    expect(items[2]?.textContent).toContain("Third item");
  });

  it("renders numbered lines as <ol><li> elements", () => {
    const text = "Steps to apply:\n\n1. Create an account.\n2. Complete the form.\n3. Submit.";
    const { container } = render(<StructuredAnswer text={text} />);
    const ol = container.querySelector("ol");
    expect(ol).not.toBeNull();
    const items = ol!.querySelectorAll("li");
    expect(items.length).toBe(3);
    expect(items[0]?.textContent).toContain("Create an account.");
    expect(items[1]?.textContent).toContain("Complete the form.");
    expect(items[2]?.textContent).toContain("Submit.");
  });

  it("renders citation markers as superscript elements", () => {
    const text = "The office is open Monday-Friday. [1]";
    const { container } = render(<StructuredAnswer text={text} />);
    const sup = container.querySelector("sup");
    expect(sup).not.toBeNull();
    expect(sup!.textContent).toBe("(1)");
    // The main text should not contain the raw [1] marker.
    expect(container.textContent).not.toContain("[1]");
  });

  it("does not flatten newlines into a single paragraph", () => {
    const text = "Direct answer.\n\n• Bullet one\n• Bullet two\n\nFinal note.";
    const { container } = render(<StructuredAnswer text={text} />);
    // Should have multiple top-level children (p, ul, p).
    const children = container.firstElementChild!.children;
    expect(children.length).toBeGreaterThanOrEqual(3);
  });

  it("does not render literal • characters inside paragraph text", () => {
    const text = "Intro.\n\n• Item A\n• Item B";
    const { container } = render(<StructuredAnswer text={text} />);
    const paragraphs = container.querySelectorAll("p");
    for (const p of paragraphs) {
      expect(p.textContent).not.toContain("•");
    }
  });
});
