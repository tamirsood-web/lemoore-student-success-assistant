"use client";

import { useRef, useEffect } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/Button";

const MAX_CHARS = 2000;

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error?: string;
};

export function ChatInput({ value, onChange, onSubmit, isLoading, error }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const remaining = MAX_CHARS - value.length;
  const nearLimit = remaining <= 100;
  const overLimit = remaining < 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2">
        <label htmlFor="chat-input" className="sr-only">Ask a question about Lemoore College</label>
        <textarea
          ref={ref}
          id="chat-input"
          rows={1}
          placeholder="Ask a question about Lemoore College…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!isLoading && value.trim()) onSubmit(); } }}
          disabled={isLoading}
          maxLength={MAX_CHARS + 50}
          aria-describedby={error ? "chat-input-error" : "chat-input-hint"}
          aria-invalid={Boolean(error)}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
        />
        <Button type="button" size="sm" aria-label="Send message" disabled={!value.trim() || overLimit} isLoading={isLoading} onClick={onSubmit} className="mb-0.5 shrink-0">
          {!isLoading && <SendHorizonal aria-hidden="true" className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex items-center justify-between px-1">
        <p id="chat-input-hint" className="text-xs text-muted-foreground">Press Enter to send · Shift+Enter for new line</p>
        {nearLimit && (
          <p aria-live="polite" className={`text-xs ${overLimit ? "text-red-600" : "text-amber-600"}`}>
            {overLimit ? `${Math.abs(remaining)} over limit` : `${remaining} left`}
          </p>
        )}
      </div>
      {error && <p id="chat-input-error" role="alert" className="px-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
