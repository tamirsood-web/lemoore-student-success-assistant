import Image from "next/image";
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
    <div className={cn("flex items-end gap-2", isQuestion ? "justify-end" : "justify-start")}>
      {!isQuestion && (
        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full">
          <Image
            src="/lemoore-logo.png"
            alt="Lemoore College Chatbot"
            fill
            className="object-cover"
          />
        </div>
      )}
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
