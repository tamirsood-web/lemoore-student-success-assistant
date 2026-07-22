"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistantResponse } from "@/types";
import type { ChatState, Turn } from "./states";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { EmptyState } from "./EmptyState";

const GENERIC_ERROR =
  "Sorry — something went wrong while getting your answer. Please try again.";

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

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: question }),
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
