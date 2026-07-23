"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Button, Spinner, Textarea } from "@/components/ui";

export interface ChatInputProps {
  readonly onSubmit: (message: string) => void;
  readonly pending: boolean;
  readonly maxInputChars: number;
  /** Optional container-level validation message (e.g., from a chip submission). */
  readonly validationMessage?: string;
}

/** Validated chat input. Submits on click or Ctrl/Cmd+Enter; multiline entry preserved. */
export function ChatInput({
  onSubmit,
  pending,
  maxInputChars,
  validationMessage,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  const trimmedLength = value.trim().length;
  const isEmpty = trimmedLength === 0;
  const overMax = value.length > maxInputChars;
  const canSubmit = !pending && !isEmpty && !overMax;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(value);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const errorMessage = overMax
    ? `Your question is too long. Please keep it under ${maxInputChars} characters.`
    : validationMessage;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        Your question
      </label>
      <Textarea
        id={inputId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={pending}
        aria-invalid={overMax || undefined}
        aria-describedby={errorMessage ? `${hintId} ${errorId}` : hintId}
        placeholder="Ask about admissions, financial aid, deadlines, and more…"
      />
      <div className="flex items-center justify-between gap-3">
        <p id={hintId} className="text-xs text-muted-foreground">
          {value.length}/{maxInputChars} · Press Ctrl+Enter to send
        </p>
        <Button type="submit" disabled={!canSubmit}>
          {pending ? <Spinner label="Thinking" /> : "Send"}
        </Button>
      </div>
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-sm text-foreground">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
