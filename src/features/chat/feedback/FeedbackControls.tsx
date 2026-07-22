"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

type FeedbackState = "idle" | "submitting" | "success" | "error";

export interface FeedbackControlsProps {
  /** Local turn identifier used as the feedback conversation reference. */
  readonly conversationId: string;
}

/** Helpful/Unhelpful controls. POSTs to /api/feedback; failures never block the chat. */
export function FeedbackControls({ conversationId }: FeedbackControlsProps) {
  const [state, setState] = useState<FeedbackState>("idle");

  const send = async (helpful: boolean) => {
    if (state === "submitting" || state === "success") return;
    setState("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, helpful }),
      });
      setState(res.ok ? "success" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
        Thanks for the feedback.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Was this helpful?</span>
      <Button
        variant="secondary"
        size="sm"
        disabled={state === "submitting"}
        onClick={() => void send(true)}
      >
        Helpful
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={state === "submitting"}
        onClick={() => void send(false)}
      >
        Unhelpful
      </Button>
      {state === "error" ? (
        <span className="text-sm text-muted-foreground" role="status">
          {"Couldn't send feedback. Please try again."}
        </span>
      ) : null}
    </div>
  );
}
