"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistantResponse } from "@/types";
import type { FallbackScenario } from "@/lib/fallback-messages";
import type { ChatState, Turn } from "./states";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { EmptyState } from "./EmptyState";

/** Shape of error responses from the API (non-2xx). */
type ErrorPayload = { fallbackScenario?: FallbackScenario };

/** Shape of a success response that may carry an optional fallbackScenario. */
type SuccessPayload = AssistantResponse & { fallbackScenario?: FallbackScenario };

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

        if (!res.ok) {
          // Non-2xx: extract fallbackScenario from the error payload.
          let scenario: FallbackScenario = "technicalError";
          try {
            const errBody = (await res.json()) as ErrorPayload;
            if (errBody.fallbackScenario) {
              scenario = errBody.fallbackScenario;
            }
          } catch {
            // JSON parsing failed — keep technicalError.
          }
          setTurns((prev) =>
            prev.map((turn) =>
              turn.id === id
                ? { ...turn, state: { kind: "failed", scenario } }
                : turn,
            ),
          );
          setState({ status: "error" });
          return;
        }

        const payload = (await res.json()) as SuccessPayload;

        // If the server attached a fallbackScenario, render the fallback message
        // instead of the normal assistant answer.
        if (payload.fallbackScenario) {
          setTurns((prev) =>
            prev.map((turn) =>
              turn.id === id
                ? { ...turn, state: { kind: "fallback", scenario: payload.fallbackScenario! } }
                : turn,
            ),
          );
          setState({ status: "ready" });
          return;
        }

        // Normal grounded answer.
        const { fallbackScenario: _, ...response } = payload;
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
              ? { ...turn, state: { kind: "failed", scenario: "technicalError" } }
              : turn,
          ),
        );
        setState({ status: "error" });
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
