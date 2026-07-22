import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface MessageBubbleProps {
  readonly role: "question" | "answer";
  readonly children: ReactNode;
}

/** Presentational chat bubble. Renders plain children only (no untrusted HTML). */
export function MessageBubble({ role, children }: MessageBubbleProps) {
  const isQuestion = role === "question";
  return (
    <div className={cn("flex", isQuestion ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm",
          isQuestion
            ? "bg-accent text-accent-foreground"
            : "border border-border bg-muted text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}
