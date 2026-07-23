"use client";

// Browser-based simulation of an unanswered Lemoore College support call being redirected to
// the AI assistant. NOT a real call: no Twilio/Connect/SIP/telephony. Caller questions go
// through the SAME live endpoint the website search + floating assistant use (POST /api/search)
// and reuse the shared WebsiteSearchResponse contract + SearchAnswerView renderer, so answers
// and citations have identical provenance. Voice (TTS + recognition) is optional and degrades
// gracefully; typed input is always available. No AWS config/ids/prompts/internal errors are
// ever surfaced.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WebsiteSearchResponse } from "@/types";
import { SearchAnswerView } from "@/features/search/SearchAnswerView";
import { useSpeech } from "./useSpeech";
import {
  buildSummary,
  formatDuration,
  spokenTextFor,
  CALL_ERROR_MESSAGE,
  GREETING,
  type CallPhase,
  type TranscriptEntry,
} from "./voiceState";

type AiActivity = "idle" | "speaking" | "listening" | "thinking";

const SIMULATION_LABEL = "Simulation only — no real phone call is being placed.";
const CALLER_NAME = "Lemoore College Student Support";

export function VoiceDemo() {
  const [phase, setPhase] = useState<CallPhase>("incoming");
  const [transcript, setTranscript] = useState<readonly TranscriptEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [pending, setPending] = useState(false);
  const [activity, setActivity] = useState<AiActivity>("idle");
  const [draft, setDraft] = useState("");

  const idRef = useRef(0);
  const mutedRef = useRef(muted);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const speech = useSpeech();

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const nextId = useCallback(() => {
    idRef.current += 1;
    return `e${idRef.current}`;
  }, []);

  // Call-duration timer — runs only while the call is active.
  useEffect(() => {
    if (phase !== "active") return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Keep the transcript scrolled to the latest line (guarded for jsdom).
  useEffect(() => {
    const el = transcriptRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight });
    }
  }, [transcript]);

  const speakResponse = useCallback(
    (text: string) => {
      if (mutedRef.current || !speech.ttsSupported || !text.trim()) {
        setActivity("idle");
        return;
      }
      setActivity("speaking");
      speech.speak(text, { onEnd: () => setActivity("idle") });
    },
    [speech],
  );

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || pending) return;

      speech.stopListening();
      const pendingId = nextId();
      setTranscript((prev) => [
        ...prev,
        { id: nextId(), role: "caller", text: question },
        { id: pendingId, role: "assistant", variant: "pending" },
      ]);
      setDraft("");
      setPending(true);
      setActivity("thinking");

      let response: WebsiteSearchResponse;
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: question }),
        });
        response = (await res.json()) as WebsiteSearchResponse;
      } catch {
        // Never surface the raw network/AWS error — use a safe, friendly line.
        response = { kind: "error", message: CALL_ERROR_MESSAGE };
      }

      setTranscript((prev) =>
        prev.map((entry) =>
          entry.id === pendingId
            ? { id: pendingId, role: "assistant", variant: "answer", response }
            : entry,
        ),
      );
      setPending(false);
      speakResponse(spokenTextFor(response));
    },
    [pending, nextId, speech, speakResponse],
  );

  const answerCall = useCallback(() => {
    setPhase("active");
    setElapsed(0);
    setTranscript([{ id: nextId(), role: "assistant", variant: "text", text: GREETING }]);
    speakResponse(GREETING);
  }, [nextId, speakResponse]);

  const declineCall = useCallback(() => {
    speech.cancelSpeech();
    speech.stopListening();
    setPhase("declined");
  }, [speech]);

  const endCall = useCallback(() => {
    speech.cancelSpeech();
    speech.stopListening();
    setActivity("idle");
    setPhase("ended");
  }, [speech]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (next) {
        speech.cancelSpeech();
        speech.stopListening();
        setActivity("idle");
      }
      return next;
    });
  }, [speech]);

  const startVoiceInput = useCallback(() => {
    if (muted) return;
    setActivity("listening");
    speech.startListening({
      onResult: (text) => void ask(text),
      onError: () => setActivity("idle"),
    });
  }, [ask, muted, speech]);

  const restart = useCallback(() => {
    setPhase("incoming");
    setTranscript([]);
    setElapsed(0);
    setMuted(false);
    setActivity("idle");
    setDraft("");
  }, []);

  const summary = useMemo(
    () => buildSummary({ elapsedSeconds: elapsed, transcript }),
    [elapsed, transcript],
  );

  const handleSubmit = useCallback(() => {
    if (draft.trim()) void ask(draft);
  }, [ask, draft]);

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-lc-wash px-4 py-8">
      <div className="w-full max-w-md">
        {phase === "incoming" ? (
          <IncomingScreen onAnswer={answerCall} onDecline={declineCall} />
        ) : null}

        {phase === "active" ? (
          <ActiveScreen
            elapsed={elapsed}
            muted={muted}
            pending={pending}
            activity={activity}
            transcript={transcript}
            transcriptRef={transcriptRef}
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={handleSubmit}
            onInputKeyDown={onInputKeyDown}
            onEnd={endCall}
            onToggleMute={toggleMute}
            onStartVoice={startVoiceInput}
            sttSupported={speech.sttSupported}
            micStatus={speech.micStatus}
            ttsSupported={speech.ttsSupported}
          />
        ) : null}

        {phase === "ended" ? <EndedScreen summary={summary} onRestart={restart} /> : null}

        {phase === "declined" ? <DeclinedScreen onRestart={restart} /> : null}
      </div>
    </main>
  );
}

/* ---------------------------------- Screens ---------------------------------- */

function SimulationBadge() {
  return (
    <p
      role="note"
      className="mt-4 rounded-md border border-lc-gold/40 bg-lc-gold/10 px-3 py-2 text-center text-xs font-medium text-lc-ink"
    >
      {SIMULATION_LABEL}
    </p>
  );
}

function IncomingScreen({
  onAnswer,
  onDecline,
}: {
  readonly onAnswer: () => void;
  readonly onDecline: () => void;
}) {
  return (
    <section
      aria-labelledby="incoming-title"
      className="rounded-2xl border border-lc-line bg-white p-6 text-center shadow-sm"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-lc-slate">Incoming call</p>
      <div
        className="mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-full bg-lc-navy text-2xl font-bold text-white motion-safe:animate-pulse"
        aria-hidden="true"
      >
        LC
      </div>
      <h1 id="incoming-title" className="mt-4 text-xl font-bold text-lc-ink">
        {CALLER_NAME}
      </h1>
      <p className="mt-1 text-sm text-lc-slate">Redirected to the AI student assistant</p>

      <div className="mt-8 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={onDecline}
          className="flex flex-col items-center gap-2 focus-visible:outline-none"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2">
            <PhoneIcon className="h-6 w-6 rotate-[135deg]" />
          </span>
          <span className="text-sm font-medium text-lc-ink">Decline</span>
        </button>

        <button
          type="button"
          onClick={onAnswer}
          className="flex flex-col items-center gap-2 focus-visible:outline-none"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 motion-safe:animate-pulse">
            <PhoneIcon className="h-6 w-6" />
          </span>
          <span className="text-sm font-medium text-lc-ink">Answer</span>
        </button>
      </div>

      <SimulationBadge />
    </section>
  );
}

function ActiveScreen(props: {
  readonly elapsed: number;
  readonly muted: boolean;
  readonly pending: boolean;
  readonly activity: AiActivity;
  readonly transcript: readonly TranscriptEntry[];
  readonly transcriptRef: React.RefObject<HTMLDivElement | null>;
  readonly draft: string;
  readonly onDraftChange: (v: string) => void;
  readonly onSubmit: () => void;
  readonly onInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  readonly onEnd: () => void;
  readonly onToggleMute: () => void;
  readonly onStartVoice: () => void;
  readonly sttSupported: boolean;
  readonly micStatus: string;
  readonly ttsSupported: boolean;
}) {
  const status =
    props.activity === "thinking"
      ? "Checking official sources…"
      : props.activity === "speaking"
        ? "Assistant speaking…"
        : props.activity === "listening"
          ? "Listening…"
          : "Connected";

  return (
    <section
      aria-labelledby="active-title"
      className="flex h-[85vh] max-h-[720px] flex-col overflow-hidden rounded-2xl border border-lc-line bg-white shadow-sm"
    >
      {/* Header: caller + status + timer */}
      <header className="flex items-center justify-between border-b border-lc-line bg-lc-navy px-4 py-3 text-white">
        <div>
          <h1 id="active-title" className="text-sm font-bold leading-tight">
            {CALLER_NAME}
          </h1>
          <p className="text-xs text-white/80" aria-live="polite">
            <span data-testid="caller-status">{status}</span>
          </p>
        </div>
        <div className="text-right">
          <span
            className="font-mono text-sm tabular-nums"
            aria-label={`Call duration ${formatDuration(props.elapsed)}`}
            data-testid="call-timer"
          >
            {formatDuration(props.elapsed)}
          </span>
        </div>
      </header>

      {/* Speaking / listening indicator */}
      <div className="flex items-center justify-center gap-3 border-b border-lc-line bg-lc-wash py-3">
        <ActivityIndicator activity={props.activity} muted={props.muted} />
      </div>

      {/* Transcript */}
      <div
        ref={props.transcriptRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-label="Live conversation transcript"
        data-testid="transcript"
      >
        {props.transcript.map((entry) => (
          <TranscriptRow key={entry.id} entry={entry} />
        ))}
      </div>

      {/* Input + controls */}
      <footer className="border-t border-lc-line bg-white px-4 py-3">
        {!props.sttSupported ? (
          <p className="mb-2 text-xs text-lc-slate" data-testid="voice-unavailable-notice">
            Voice input isn&apos;t available in this browser — type your message below.
          </p>
        ) : props.micStatus === "denied" ? (
          <p className="mb-2 text-xs text-lc-slate" role="status">
            Microphone access was blocked — type your message below.
          </p>
        ) : null}

        <div className="flex items-end gap-2">
          <label htmlFor="voice-caller-input" className="sr-only">
            Type a caller message
          </label>
          <textarea
            id="voice-caller-input"
            rows={1}
            value={props.draft}
            onChange={(e) => props.onDraftChange(e.target.value)}
            onKeyDown={props.onInputKeyDown}
            placeholder="Type what the caller says…"
            disabled={props.pending}
            className="min-h-[40px] flex-1 resize-none rounded-md border border-lc-line px-3 py-2 text-sm text-lc-ink focus-visible:border-lc-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lc-blue/30"
          />
          <button
            type="button"
            onClick={props.onSubmit}
            disabled={props.pending || props.draft.trim().length === 0}
            className="h-10 rounded-md bg-lc-blue px-4 text-sm font-medium text-white hover:bg-lc-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={props.onToggleMute}
              aria-pressed={props.muted}
              className="rounded-md border border-lc-line px-3 py-2 text-sm font-medium text-lc-ink hover:bg-lc-wash"
            >
              {props.muted ? "Unmute" : "Mute"}
            </button>
            {props.sttSupported ? (
              <button
                type="button"
                onClick={props.onStartVoice}
                disabled={props.muted || props.pending || props.micStatus === "listening"}
                className="rounded-md border border-lc-line px-3 py-2 text-sm font-medium text-lc-ink hover:bg-lc-wash disabled:cursor-not-allowed disabled:opacity-50"
              >
                {props.micStatus === "listening" ? "Listening…" : "Speak"}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={props.onEnd}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
          >
            End call
          </button>
        </div>

        <p className="mt-3 text-center text-xs font-medium text-lc-slate">{SIMULATION_LABEL}</p>
      </footer>
    </section>
  );
}

function TranscriptRow({ entry }: { readonly entry: TranscriptEntry }) {
  if (entry.role === "caller") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-lc-blue px-3 py-2 text-sm text-white">
          <span className="sr-only">Caller said: </span>
          <span>{entry.text}</span>
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-lc-line bg-lc-wash px-3 py-2 text-sm text-lc-ink">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-lc-slate">
          Assistant
        </p>
        {entry.variant === "pending" ? (
          <p className="text-lc-slate" aria-live="polite">
            Checking official sources…
          </p>
        ) : entry.variant === "text" ? (
          <p className="leading-relaxed">{entry.text}</p>
        ) : (
          <SearchAnswerView response={entry.response} />
        )}
      </div>
    </div>
  );
}

function ActivityIndicator({
  activity,
  muted,
}: {
  readonly activity: AiActivity;
  readonly muted: boolean;
}) {
  const label = muted
    ? "Muted"
    : activity === "speaking"
      ? "Assistant is speaking"
      : activity === "listening"
        ? "Listening to caller"
        : activity === "thinking"
          ? "Assistant is thinking"
          : "Connected";
  const active = !muted && activity !== "idle";
  return (
    <div className="flex items-center gap-2" data-testid="activity-indicator" aria-label={label}>
      <span className="flex items-end gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-1.5 rounded-full ${active ? "bg-lc-blue motion-safe:animate-pulse" : "bg-lc-line"}`}
            style={{ height: active ? `${8 + i * 4}px` : "8px", animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      <span className="text-xs font-medium text-lc-slate">{label}</span>
    </div>
  );
}

function EndedScreen({
  summary,
  onRestart,
}: {
  readonly summary: ReturnType<typeof buildSummary>;
  readonly onRestart: () => void;
}) {
  return (
    <section
      aria-labelledby="summary-title"
      className="rounded-2xl border border-lc-line bg-white p-6 shadow-sm"
    >
      <h1 id="summary-title" className="text-lg font-bold text-lc-ink">
        Call summary
      </h1>
      <p className="mt-1 text-sm text-lc-slate">The simulated call has ended.</p>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between border-b border-lc-line pb-2">
          <dt className="text-lc-slate">Duration</dt>
          <dd className="font-medium text-lc-ink" data-testid="summary-duration">
            {summary.durationLabel}
          </dd>
        </div>
        <div className="flex justify-between border-b border-lc-line pb-2">
          <dt className="text-lc-slate">Caller questions</dt>
          <dd className="font-medium text-lc-ink" data-testid="summary-questions">
            {summary.questionCount}
          </dd>
        </div>
        <div className="flex justify-between border-b border-lc-line pb-2">
          <dt className="text-lc-slate">Escalation recommended</dt>
          <dd className="font-medium text-lc-ink" data-testid="summary-escalation">
            {summary.escalationRecommended ? "Yes" : "No"}
          </dd>
        </div>
        <div className="border-b border-lc-line pb-2">
          <dt className="text-lc-slate">Cited sources used</dt>
          <dd className="mt-2" data-testid="summary-sources">
            {summary.citedSources.length === 0 ? (
              <span className="text-lc-slate">None</span>
            ) : (
              <ul className="list-disc space-y-1 pl-5">
                {summary.citedSources.map((s) => (
                  <li key={s.id} className="text-lc-ink">
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lc-blue underline"
                      >
                        {s.title}
                      </a>
                    ) : (
                      s.title
                    )}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onRestart}
        className="mt-6 w-full rounded-md bg-lc-blue px-4 py-2 text-sm font-semibold text-white hover:bg-lc-blue-dark"
      >
        Start a new simulated call
      </button>
      <SimulationBadge />
    </section>
  );
}

function DeclinedScreen({ onRestart }: { readonly onRestart: () => void }) {
  return (
    <section
      aria-labelledby="declined-title"
      className="rounded-2xl border border-lc-line bg-white p-6 text-center shadow-sm"
    >
      <h1 id="declined-title" className="text-lg font-bold text-lc-ink">
        Call declined
      </h1>
      <p className="mt-2 text-sm text-lc-slate">
        No call was placed. You can start a new simulated call at any time.
      </p>
      <button
        type="button"
        onClick={onRestart}
        className="mt-6 w-full rounded-md bg-lc-blue px-4 py-2 text-sm font-semibold text-white hover:bg-lc-blue-dark"
      >
        Back to incoming call
      </button>
      <SimulationBadge />
    </section>
  );
}

function PhoneIcon({ className }: { readonly className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 5.5c0-.6.4-1 1-1h2.2c.5 0 .9.3 1 .8l.8 3c.1.4 0 .8-.3 1.1l-1.4 1.3a13 13 0 0 0 5.5 5.5l1.3-1.4c.3-.3.7-.4 1.1-.3l3 .8c.5.1.8.5.8 1V19c0 .6-.4 1-1 1A15 15 0 0 1 4.5 5.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
