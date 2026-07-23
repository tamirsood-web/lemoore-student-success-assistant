"use client";

import { User, Bot, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/Badge";
import { CitationList } from "@/features/citations";
import { EscalationCard } from "@/features/escalation";
import { FeedbackControls } from "@/features/feedback";
import type { AssistantResponse, Confidence } from "@/types";

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  if (confidence === "high") return <Badge variant="success">Verified answer</Badge>;
  if (confidence === "medium") return <Badge variant="info">Likely accurate — verify if important</Badge>;
  return <Badge variant="warning">Could not fully verify</Badge>;
}

function AnswerText({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2">
      {text.split(/\n+/).filter(Boolean).map((para, i) => (
        <p key={i} className="text-sm leading-relaxed text-foreground">{para}</p>
      ))}
    </div>
  );
}

export function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[85%] items-start gap-2 sm:max-w-[75%]">
        <div className="rounded-2xl rounded-tr-sm bg-accent px-4 py-2.5">
          <p className="text-sm text-accent-foreground">{text}</p>
        </div>
        <span aria-hidden="true" className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </span>
      </div>
    </div>
  );
}

type AssistantMessageProps = {
  response: AssistantResponse;
  conversationId: string;
  onSuggestedQuestion?: (q: string) => void;
};

export function AssistantMessage({ response, conversationId, onSuggestedQuestion }: AssistantMessageProps) {
  const isSafeRejection = response.kind === "safe_rejection";
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10">
        {isSafeRejection
          ? <ShieldAlert className="h-4 w-4 text-accent" />
          : <Bot className="h-4 w-4 text-accent" />}
      </span>

      <div className="flex max-w-[90%] flex-col gap-4 sm:max-w-[80%]">
        {!isSafeRejection && <ConfidenceBadge confidence={response.confidence} />}
        <AnswerText text={response.answer} />
        {response.citations.length > 0 && <CitationList citations={response.citations} />}
        {response.kind === "insufficient_evidence" && <EscalationCard escalation={response.escalation} />}

        {response.suggestedQuestions.length > 0 && onSuggestedQuestion && (
          <section aria-label="Suggested questions">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">You might also ask</h3>
            <ul className="flex flex-col gap-1.5">
              {response.suggestedQuestions.map((q) => (
                <li key={q}>
                  <button
                    onClick={() => onSuggestedQuestion(q)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <FeedbackControls conversationId={conversationId} />
      </div>
    </div>
  );
}
