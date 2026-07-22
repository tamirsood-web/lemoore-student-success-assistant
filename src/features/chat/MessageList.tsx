import type { AssistantResponse, Confidence } from "@/types";
import { Spinner } from "@/components/ui";
import type { Turn } from "./states";
import { MessageBubble } from "./MessageBubble";
import { CitationList } from "./citations/CitationList";
import { EscalationCard } from "./escalation/EscalationCard";
import { FeedbackControls } from "./feedback/FeedbackControls";
import { ExampleQuestions } from "./ExampleQuestions";

/** Confidence-safe, conservative wording. Numeric scores are never shown. */
function confidenceLead(confidence: Confidence): string {
  switch (confidence) {
    case "high":
      return "Based on the available source information…";
    case "medium":
      return "The available information suggests…";
    case "low":
      return "I could not fully verify this…";
  }
}

/** Short, non-alarming label distinguishing the response kind. */
function kindLabel(response: AssistantResponse): string | null {
  switch (response.kind) {
    case "grounded":
      return null;
    case "insufficient_evidence":
      return "Not verified from sources";
    case "safe_rejection":
      return "Privacy notice";
  }
}

export interface MessageListProps {
  readonly turns: readonly Turn[];
  readonly onSelectFollowUp: (question: string) => void;
  readonly pending: boolean;
}

/** Renders the conversation. The assistant region is a polite live log. */
export function MessageList({
  turns,
  onSelectFollowUp,
  pending,
}: MessageListProps) {
  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className="flex flex-col gap-4"
    >
      {turns.map((turn) => (
        <div key={turn.id} className="flex flex-col gap-2">
          <MessageBubble role="question">{turn.question}</MessageBubble>

          {turn.state.kind === "pending" ? (
            <Spinner label="Finding an answer…" />
          ) : turn.state.kind === "failed" ? (
            <p role="alert" className="text-sm text-foreground">
              {turn.state.message}
            </p>
          ) : (
            <AssistantAnswer
              response={turn.state.response}
              conversationId={turn.id}
              onSelectFollowUp={onSelectFollowUp}
              pending={pending}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function AssistantAnswer({
  response,
  conversationId,
  onSelectFollowUp,
  pending,
}: {
  readonly response: AssistantResponse;
  readonly conversationId: string;
  readonly onSelectFollowUp: (question: string) => void;
  readonly pending: boolean;
}) {
  const label = kindLabel(response);
  return (
    <div className="flex flex-col">
      {label ? (
        <span className="mb-1 inline-flex w-fit rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {label}
        </span>
      ) : null}
      <p className="mb-1 text-xs text-muted-foreground">
        {confidenceLead(response.confidence)}
      </p>
      <MessageBubble role="answer">{response.answer}</MessageBubble>

      <CitationList citations={response.citations} />
      <EscalationCard response={response} />
      <FeedbackControls conversationId={conversationId} />
      <ExampleQuestions
        questions={response.suggestedQuestions}
        onSelect={onSelectFollowUp}
        disabled={pending}
        label="Suggested follow-ups"
      />
    </div>
  );
}
