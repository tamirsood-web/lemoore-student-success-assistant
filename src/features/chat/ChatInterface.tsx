"use client";

import { useState, useRef, useEffect, useId } from "react";
import { Spinner } from "@/components/Spinner";
import { ChatInput } from "./ChatInput";
import { AssistantMessage, UserMessage } from "./ChatMessage";
import type { AssistantResponse } from "@/types";

type Turn =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; conversationId: string; response: AssistantResponse };

type ChatState = "idle" | "loading" | "error";

const EXAMPLE_QUESTIONS = [
  "How do I register for classes?",
  "Where can I get financial aid help?",
  "How do I request an official transcript?",
  "What are the Admissions & Records office hours?",
  "What is the census date for MATH 101-01 Fall 2025?",
];

export function ChatInterface() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chatState, setChatState] = useState<ChatState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadingId = useId();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, chatState]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || chatState === "loading") return;

    const conversationId = crypto.randomUUID();
    setTurns((prev) => [...prev, { kind: "user", id: crypto.randomUUID(), text: trimmed }]);
    setInputValue("");
    setChatState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await res.json()) as AssistantResponse & { error?: string };
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "The assistant could not respond.");

      setTurns((prev) => [...prev, { kind: "assistant", id: crypto.randomUUID(), conversationId, response: data }]);
      setChatState("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setChatState("error");
    }
  }

  const showWelcome = turns.length === 0 && chatState === "idle";

  return (
    <div className="flex h-full flex-col">
      {/* Message area */}
      <div role="log" aria-label="Conversation" aria-live="polite" className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">

          {showWelcome && (
            <section aria-label="Welcome">
              <div className="mb-6 text-center">
                <h2 className="text-lg font-semibold text-foreground">How can I help you today?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  I answer questions using official Lemoore College sources and always show where the information came from.
                </p>
              </div>
              <ul aria-label="Example questions" className="flex flex-col gap-2">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <li key={q}>
                    <button
                      onClick={() => void sendMessage(q)}
                      className="w-full rounded-lg border border-border bg-background px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {turns.map((turn) =>
            turn.kind === "user"
              ? <UserMessage key={turn.id} text={turn.text} />
              : <AssistantMessage key={turn.id} response={turn.response} conversationId={turn.conversationId} onSuggestedQuestion={(q) => void sendMessage(q)} />
          )}

          {chatState === "loading" && (
            <div id={loadingId} aria-live="assertive" className="flex items-center gap-3 pl-10">
              <Spinner label="Searching approved sources…" size="sm" />
              <span className="text-sm text-muted-foreground">Searching approved sources…</span>
            </div>
          )}

          {chatState === "error" && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-300">
              {errorMsg}{" "}
              <button className="font-medium underline underline-offset-2" onClick={() => { setChatState("idle"); setErrorMsg(""); }}>Dismiss</button>
            </div>
          )}

          <div ref={bottomRef} aria-hidden="true" />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => void sendMessage(inputValue)}
            isLoading={chatState === "loading"}
            error={chatState === "error" ? errorMsg : undefined}
          />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Answers come only from approved Lemoore College sources. Always verify important deadlines with your college office.
          </p>
        </div>
      </div>
    </div>
  );
}
