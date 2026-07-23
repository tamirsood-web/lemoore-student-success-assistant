// Task 8.3 — ChatInput validation + submission behavior.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "./ChatInput";

function setup(overrides?: Partial<Parameters<typeof ChatInput>[0]>) {
  const onSubmit = vi.fn();
  const props = {
    onSubmit,
    pending: false,
    maxInputChars: 2000,
    ...overrides,
  };
  render(<ChatInput {...props} />);
  return { onSubmit };
}

describe("ChatInput", () => {
  it("cannot submit empty input", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    const send = screen.getByRole("button", { name: "Send" });
    expect(send).toBeDisabled();
    await user.click(send);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("cannot submit whitespace-only input", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.type(screen.getByLabelText("Your question"), "     ");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an accessible validation error and blocks submit when over maximum", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup({ maxInputChars: 5 });
    const textarea = screen.getByLabelText("Your question");
    await user.type(textarea, "123456"); // 6 > 5

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/too long/i);
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid input and clears the field", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    const textarea = screen.getByLabelText("Your question");
    await user.type(textarea, "What are the admissions office hours?");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("What are the admissions office hours?");
    expect(textarea).toHaveValue("");
  });

  it("blocks submission while a request is pending", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup({ pending: true });
    // Pending shows a Thinking status and the submit control is disabled.
    expect(screen.getByRole("status")).toHaveTextContent("Thinking");
    const send = screen.getByRole("button");
    expect(send).toBeDisabled();
    await user.click(send);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("preserves multiline entry", async () => {
    const user = userEvent.setup();
    setup();
    const textarea = screen.getByLabelText("Your question");
    await user.type(textarea, "first line{enter}second line");
    expect(textarea).toHaveValue("first line\nsecond line");
  });

  it("submits on Ctrl/Cmd+Enter (implementation provides this shortcut)", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    const textarea = screen.getByLabelText("Your question");
    await user.type(textarea, "How do I contact counseling?");
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(onSubmit).toHaveBeenCalledWith("How do I contact counseling?");
  });
});
