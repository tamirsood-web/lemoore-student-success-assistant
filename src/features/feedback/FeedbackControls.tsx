"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/Button";

type FeedbackState = "idle" | "commenting" | "submitting" | "done" | "error";

type Props = { conversationId: string };

export function FeedbackControls({ conversationId }: Props) {
  const [state, setState] = useState<FeedbackState>("idle");
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(isHelpful: boolean, comment?: string) {
    setState("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, helpful: isHelpful, reason: comment?.trim() || undefined }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Feedback could not be saved.");
      }
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  if (state === "done") {
    return <p className="text-xs text-muted-foreground" role="status">Thanks for your feedback.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {state === "idle" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Was this helpful?</span>
          <Button variant="ghost" size="sm" aria-label="Mark as helpful" onClick={() => { setHelpful(true); setState("commenting"); }}>
            <ThumbsUp aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" aria-label="Mark as not helpful" onClick={() => { setHelpful(false); setState("commenting"); }}>
            <ThumbsDown aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      )}

      {state === "commenting" && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3">
          <p className="text-xs font-medium text-foreground">
            {helpful ? "Glad it helped! Any other thoughts?" : "Sorry about that. What could be better?"}
          </p>
          <textarea
            aria-label="Optional feedback comment"
            placeholder="Optional — add a comment…"
            maxLength={500}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full resize-none rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => helpful !== null && void submit(helpful, reason)}>Submit</Button>
            <Button variant="ghost" size="sm" onClick={() => helpful !== null && void submit(helpful)}>Skip</Button>
          </div>
        </div>
      )}

      {state === "submitting" && <p className="text-xs text-muted-foreground" role="status">Saving…</p>}

      {state === "error" && (
        <p className="text-xs text-red-600" role="alert">
          {errorMsg}{" "}
          <button className="underline underline-offset-2" onClick={() => setState("idle")}>Try again</button>
        </p>
      )}
    </div>
  );
}
