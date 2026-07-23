"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistantResponse, HistoryTurn } from "@/types";
import type { ChatState, Turn } from "./states";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { EmptyState } from "./EmptyState";

const GENERIC_ERROR =
  "Sorry — something went wrong while getting your answer. Please try again.";

/** Maximum number of recent turns to include in the history payload. */
const HISTORY_MAX_TURNS = 4;

/**
 * Maximum characters of assistant answer text to include in a history turn.
 * Long answers are truncated so the payload stays small.
 */
const HISTORY_ANSWER_MAX_CHARS = 500;

/**
 * Build the history array from settled turns, ready to send with the next request.
 * Only answered turns are included — pending/failed turns carry no useful context.
 * The array is ordered oldest-first and capped to the last `HISTORY_MAX_TURNS` turns.
 */
export function buildHistory(turns: readonly Turn[]): readonly HistoryTurn[] {
  const settled = turns.filter((t) => t.state.kind === "answered");
  const recent = settled.slice(-HISTORY_MAX_TURNS);
  const history: HistoryTurn[] = [];
  for (const turn of recent) {
    if (turn.state.kind !== "answered") continue;
    const answer = turn.state.response.answer;
    const truncatedAnswer =
      answer.length > HISTORY_ANSWER_MAX_CHARS
        ? `${answer.slice(0, HISTORY_ANSWER_MAX_CHARS - 1)}…`
        : answer;
    history.push({ role: "user", content: turn.question });
    history.push({ role: "assistant", content: truncatedAnswer });
  }
  return history;
}

export interface ChatContainerProps {
  /** Server-validated maximum input length, passed down from the server page. */
  readonly maxInputChars: number;
}

/** Client component that owns the conversation and drives POST /api/chat. */
export function ChatContainer({ maxInputChars }: ChatContainerProps) {
  const [turns, setTurns] = useState<readonly Turn[]>([]);
  const [state, setState] = useState<ChatState>({ status: "idle" });
  const idRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  // Keep a stable ref to the latest turns so the submit callback can read them
  // without being re-created on every turn update.
  const turnsRef = useRef<readonly Turn[]>(turns);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const pending = state.status === "submitting";

  const submit = useCallback(
    async (raw: string) => {
      if (abortRef.current) return; // a request is already in flight
      const question = raw.trim();
      if (question.length === 0) {
        setState({ status: "validation", message: "Please enter a question." });
        return;
      }
      if (question.length > maxInputChars) {
        setState({
          status: "validation",
          message: `Please shorten your question to ${maxInputChars} characters or fewer.`,
        });
        return;
      }

      idRef.current += 1;
      const id = String(idRef.current);
      setTurns((prev) => [...prev, { id, question, state: { kind: "pending" } }]);
      setState({ status: "submitting" });

      // Build history from the turns settled so far (before this new question).
      const history = buildHistory(turnsRef.current);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: question,
            ...(history.length > 0 ? { history } : {}),
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Request failed");
        const response = (await res.json()) as AssistantResponse;
        setTurns((prev) =>
          prev.map((turn) =>
            turn.id === id
              ? { ...turn, state: { kind: "answered", response } }
              : turn,
          ),
        );
        setState({ status: "ready" });
      } catch {
        if (controller.signal.aborted) return;
        setTurns((prev) =>
          prev.map((turn) =>
            turn.id === id
              ? { ...turn, state: { kind: "failed", message: GENERIC_ERROR } }
              : turn,
          ),
        );
        setState({ status: "error", message: GENERIC_ERROR });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [maxInputChars],
  );

  const validationMessage =
    state.status === "validation" ? state.message : undefined;

  return (
    <section aria-label="Student assistant chat" className="flex flex-col gap-6">
      {turns.length === 0 ? (
        <EmptyState onSelectExample={submit} disabled={pending} />
      ) : (
        <MessageList
          turns={turns}
          onSelectFollowUp={submit}
          pending={pending}
        />
      )}

      <ChatInput
        onSubmit={submit}
        pending={pending}
        maxInputChars={maxInputChars}
        validationMessage={validationMessage}
      />
    </section>
  );
}
