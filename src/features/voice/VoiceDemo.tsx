"use client";

// Browser simulation of an unanswered Lemoore College support call redirected to the AI
// assistant. Stage 2: when the local Nova 2 Sonic bridge is reachable, Answer opens a REAL
// bidirectional voice session (mic → bridge → Bedrock Nova 2 Sonic → tool call to the existing
// grounded search service → spoken answer + on-screen citations). When voice is unavailable
// (no bridge, denied mic, unsupported browser, or in tests) it degrades to a clearly labeled
// grounded TEXT-ONLY assistant via POST /api/search. Typed input always works. No AWS config,
// ids, prompts, or internal errors ever reach this component.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WebsiteSearchResponse } from "@/types";
import type { BridgeMessage, BridgeState } from "@/lib/nova-sonic";
import { SearchAnswerView } from "@/features/search/SearchAnswerView";
import { useNovaSonic, type NovaDiagnostics, type NovaUnavailableReason } from "./useNovaSonic";
import { initialNovaState, reduceBridge, type NovaUiState } from "./novaTranscript";
import {
  buildSummary,
  formatDuration,
  CALL_ERROR_MESSAGE,
  GREETING,
  type CallPhase,
  type TranscriptEntry,
  type VoiceCitation,
} from "./voiceState";

type VoiceMode = "idle" | "connecting" | "voice" | "text-only";

const SIMULATION_LABEL = "Live Nova 2 Sonic demo — simulated call, no phone number involved.";
const CALLER_NAME = "Lemoore College Student Support";
const SHOW_DIAGNOSTICS = process.env.NODE_ENV === "development";

export function VoiceDemo() {
  const [phase, setPhase] = useState<CallPhase>("incoming");
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("idle");
  const [transcript, setTranscript] = useState<readonly TranscriptEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<BridgeState | "idle" | "connecting" | "text-only">("idle");
  const [escalation, setEscalation] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sessionEnding, setSessionEnding] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [diag, setDiag] = useState<NovaDiagnostics | null>(null);

  const idRef = useRef(0);
  const novaStateRef = useRef<NovaUiState>(initialNovaState());
  const transcriptRef = useRef<HTMLDivElement>(null);
  const nova = useNovaSonic();

  const nextId = useCallback(() => {
    idRef.current += 1;
    return `e${idRef.current}`;
  }, []);

  // Duration timer while the call is active.
  useEffect(() => {
    if (phase !== "active") return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Keep the transcript scrolled to the newest line (guarded for jsdom).
  useEffect(() => {
    const el = transcriptRef.current;
    if (el && typeof el.scrollTo === "function") el.scrollTo({ top: el.scrollHeight });
  }, [transcript]);

  const finishCall = useCallback(() => {
    setSearching(false);
    setPhase("ended");
  }, []);

  const goTextOnly = useCallback(
    (reason: NovaUnavailableReason) => {
      setVoiceMode("text-only");
      setStatus("text-only");
      if (reason === "mic-denied") setMicNote("Microphone permission needed");
      // Seed the greeting so the text-only assistant opens the conversation.
      setTranscript((prev) =>
        prev.length > 0 ? prev : [{ id: nextId(), role: "assistant", variant: "text", text: GREETING }],
      );
    },
    [nextId],
  );

  const onNovaMessage = useCallback(
    (message: BridgeMessage) => {
      // Receiving bridge messages means the Nova voice session is live.
      if (message.t !== "error") setVoiceMode("voice");
      novaStateRef.current = reduceBridge(novaStateRef.current, message, nextId);
      const st = novaStateRef.current;
      setTranscript(st.transcript);
      setStatus(st.status);
      setEscalation(st.escalationRecommended);
      setSearching(st.searching);
      setSessionEnding(st.sessionEnding);
      if (st.ended) finishCall();
    },
    [nextId, finishCall],
  );

  const novaHandlers = useMemo(
    () => ({
      onMessage: onNovaMessage,
      onUnavailable: goTextOnly,
      onDiagnostics: (d: NovaDiagnostics) => setDiag(d),
    }),
    [onNovaMessage, goTextOnly],
  );

  const answerCall = useCallback(() => {
    setPhase("active");
    setElapsed(0);
    setMuted(false);
    setEscalation(false);
    setSearching(false);
    setSessionEnding(false);
    setMicNote(null);
    setTranscript([]);
    novaStateRef.current = initialNovaState();
    if (nova.available) {
      setVoiceMode("connecting");
      setStatus("connecting");
      void nova.connect(novaHandlers);
    } else {
      goTextOnly("unsupported");
    }
  }, [nova, novaHandlers, goTextOnly]);

  // Text-only grounded path (Nova unavailable): mirrors the shared search pipeline.
  const askTextOnly = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || pending) return;
      const pendingId = nextId();
      setTranscript((prev) => [
        ...prev,
        { id: nextId(), role: "caller", text: question },
        { id: pendingId, role: "assistant", variant: "pending" },
      ]);
      setDraft("");
      setPending(true);
      let response: WebsiteSearchResponse;
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: question }),
        });
        response = (await res.json()) as WebsiteSearchResponse;
      } catch {
        response = { kind: "error", message: CALL_ERROR_MESSAGE };
      }
      setTranscript((prev) =>
        prev.map((e) => (e.id === pendingId ? { id: pendingId, role: "assistant", variant: "answer", response } : e)),
      );
      setPending(false);
    },
    [pending, nextId],
  );

  const submitDraft = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    if (voiceMode === "voice") {
      nova.sendText(text);
      setDraft("");
    } else {
      void askTextOnly(text);
    }
  }, [draft, voiceMode, nova, askTextOnly]);

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        submitDraft();
      }
    },
    [submitDraft],
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (voiceMode === "voice") nova.setMuted(next);
      return next;
    });
  }, [voiceMode, nova]);

  const endCall = useCallback(() => {
    if (voiceMode === "voice") nova.end();
    finishCall();
  }, [voiceMode, nova, finishCall]);

  const declineCall = useCallback(() => {
    if (voiceMode === "voice") nova.end();
    setPhase("declined");
  }, [voiceMode, nova]);

  const restart = useCallback(() => {
    setPhase("incoming");
    setVoiceMode("idle");
    setTranscript([]);
    setElapsed(0);
    setMuted(false);
    setStatus("idle");
    setEscalation(false);
    setSearching(false);
    setSessionEnding(false);
    setMicNote(null);
    setDraft("");
    novaStateRef.current = initialNovaState();
  }, []);

  const summary = useMemo(
    () => buildSummary({ elapsedSeconds: elapsed, transcript, escalationRecommended: escalation }),
    [elapsed, transcript, escalation],
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-lc-wash px-4 py-8">
      <div className="w-full max-w-md">
        {phase === "incoming" ? <IncomingScreen onAnswer={answerCall} onDecline={declineCall} /> : null}

        {phase === "active" ? (
          <ActiveScreen
            elapsed={elapsed}
            muted={muted}
            pending={pending}
            voiceMode={voiceMode}
            status={status}
            searching={searching}
            sessionEnding={sessionEnding}
            micNote={micNote}
            transcript={transcript}
            transcriptRef={transcriptRef}
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={submitDraft}
            onInputKeyDown={onInputKeyDown}
            onEnd={endCall}
            onToggleMute={toggleMute}
            diag={SHOW_DIAGNOSTICS ? diag : null}
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

function IncomingScreen({ onAnswer, onDecline }: { readonly onAnswer: () => void; readonly onDecline: () => void }) {
  return (
    <section aria-labelledby="incoming-title" className="rounded-2xl border border-lc-line bg-white p-6 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-lc-slate">Incoming call</p>
      <div className="mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-full bg-lc-navy text-2xl font-bold text-white motion-safe:animate-pulse" aria-hidden="true">
        LC
      </div>
      <h1 id="incoming-title" className="mt-4 text-xl font-bold text-lc-ink">
        {CALLER_NAME}
      </h1>
      <p className="mt-1 text-sm text-lc-slate">Redirected to the AI student assistant</p>

      <div className="mt-8 flex items-center justify-center gap-6">
        <button type="button" onClick={onDecline} className="flex flex-col items-center gap-2 focus-visible:outline-none">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2">
            <PhoneIcon className="h-6 w-6 rotate-[135deg]" />
          </span>
          <span className="text-sm font-medium text-lc-ink">Decline</span>
        </button>
        <button type="button" onClick={onAnswer} className="flex flex-col items-center gap-2 focus-visible:outline-none">
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

function statusLabel(
  mode: VoiceMode,
  status: BridgeState | "idle" | "connecting" | "text-only",
  muted: boolean,
  searching: boolean,
): string {
  if (mode === "text-only") return "Voice unavailable — using text-only assistant";
  if (mode === "connecting" || status === "connecting") return "Connecting to Nova 2 Sonic…";
  if (muted || status === "muted") return "Muted";
  if (searching || status === "searching") return "Searching official Lemoore sources";
  switch (status) {
    case "caller-speaking":
      return "Caller speaking";
    case "assistant-speaking":
      return "Assistant speaking";
    case "thinking":
      return "Assistant thinking";
    case "mic-permission-needed":
      return "Microphone permission needed";
    case "reconnecting":
      return "Reconnecting…";
    case "ended":
      return "Call ended";
    case "listening":
    default:
      return "Listening";
  }
}

function ActiveScreen(props: {
  readonly elapsed: number;
  readonly muted: boolean;
  readonly pending: boolean;
  readonly voiceMode: VoiceMode;
  readonly status: BridgeState | "idle" | "connecting" | "text-only";
  readonly searching: boolean;
  readonly sessionEnding: boolean;
  readonly micNote: string | null;
  readonly transcript: readonly TranscriptEntry[];
  readonly transcriptRef: React.RefObject<HTMLDivElement | null>;
  readonly draft: string;
  readonly onDraftChange: (v: string) => void;
  readonly onSubmit: () => void;
  readonly onInputKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  readonly onEnd: () => void;
  readonly onToggleMute: () => void;
  readonly diag: NovaDiagnostics | null;
}) {
  const label = statusLabel(props.voiceMode, props.status, props.muted, props.searching);
  const active = !props.muted && (props.status === "assistant-speaking" || props.status === "caller-speaking" || props.searching);

  return (
    <section aria-labelledby="active-title" className="flex h-[85vh] max-h-[760px] flex-col overflow-hidden rounded-2xl border border-lc-line bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-lc-line bg-lc-navy px-4 py-3 text-white">
        <div>
          <h1 id="active-title" className="text-sm font-bold leading-tight">
            {CALLER_NAME}
          </h1>
          <p className="text-xs text-white/80" aria-live="polite">
            <span data-testid="caller-status">{label}</span>
          </p>
        </div>
        <span className="font-mono text-sm tabular-nums" aria-label={`Call duration ${formatDuration(props.elapsed)}`} data-testid="call-timer">
          {formatDuration(props.elapsed)}
        </span>
      </header>

      <div className="flex items-center justify-center gap-3 border-b border-lc-line bg-lc-wash py-3">
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
      </div>

      {props.sessionEnding ? (
        <p role="status" className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
          This voice session is about to reach its time limit and will end shortly.
        </p>
      ) : null}

      <div ref={props.transcriptRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite" aria-label="Live conversation transcript" data-testid="transcript">
        {props.transcript.map((entry) => (
          <TranscriptRow key={entry.id} entry={entry} />
        ))}
      </div>

      <footer className="border-t border-lc-line bg-white px-4 py-3">
        {props.voiceMode === "text-only" ? (
          <p className="mb-2 text-xs font-medium text-lc-slate" data-testid="voice-unavailable-notice">
            {props.micNote ? `${props.micNote}. ` : ""}Voice unavailable — using text-only assistant. Type your question below.
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
          <button type="button" onClick={props.onToggleMute} aria-pressed={props.muted} className="rounded-md border border-lc-line px-3 py-2 text-sm font-medium text-lc-ink hover:bg-lc-wash">
            {props.muted ? "Unmute" : "Mute"}
          </button>
          <button type="button" onClick={props.onEnd} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2">
            End call
          </button>
        </div>

        {props.diag ? <DiagnosticsPanel diag={props.diag} status={props.status} /> : null}

        <p className="mt-3 text-center text-xs font-medium text-lc-slate">{SIMULATION_LABEL}</p>
      </footer>
    </section>
  );
}

function DiagnosticsPanel({
  diag,
  status,
}: {
  readonly diag: NovaDiagnostics;
  readonly status: string;
}) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-dashed border-lc-line bg-lc-wash p-2 text-[11px] text-lc-slate" data-testid="diagnostics">
      <div className="flex justify-between"><dt>WebSocket</dt><dd>{diag.wsConnected ? "connected" : "disconnected"}</dd></div>
      <div className="flex justify-between"><dt>Nova session</dt><dd>{diag.novaActive ? "active" : "inactive"}</dd></div>
      <div className="flex justify-between"><dt>Microphone</dt><dd>{diag.micActive ? "active" : "inactive"}</dd></div>
      <div className="flex justify-between"><dt>Audio queue</dt><dd>{diag.queueSamples}</dd></div>
      <div className="col-span-2 flex justify-between"><dt>State</dt><dd>{status}</dd></div>
    </dl>
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
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-lc-line bg-lc-wash px-3 py-2 text-sm text-lc-ink">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-lc-slate">Assistant</p>
        {entry.variant === "pending" ? (
          <p className="text-lc-slate" aria-live="polite">
            Checking official sources…
          </p>
        ) : entry.variant === "text" ? (
          <p className="leading-relaxed">{entry.text}</p>
        ) : entry.variant === "voice" ? (
          <VoiceTurn text={entry.text} citations={entry.citations} />
        ) : (
          <SearchAnswerView response={entry.response} />
        )}
      </div>
    </div>
  );
}

function VoiceTurn({ text, citations }: { readonly text: string; readonly citations: readonly VoiceCitation[] }) {
  return (
    <div className="space-y-2">
      {text ? <p className="leading-relaxed">{text}</p> : null}
      {citations.length > 0 ? (
        <div>
          <h3 className="text-xs font-bold tracking-wide text-lc-slate">Sources</h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            {citations.map((c) => (
              <li key={c.url}>
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-lc-blue underline">
                  {c.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function EndedScreen({ summary, onRestart }: { readonly summary: ReturnType<typeof buildSummary>; readonly onRestart: () => void }) {
  return (
    <section aria-labelledby="summary-title" className="rounded-2xl border border-lc-line bg-white p-6 shadow-sm">
      <h1 id="summary-title" className="text-lg font-bold text-lc-ink">
        Call summary
      </h1>
      <p className="mt-1 text-sm text-lc-slate">The simulated call has ended.</p>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between border-b border-lc-line pb-2">
          <dt className="text-lc-slate">Duration</dt>
          <dd className="font-medium text-lc-ink" data-testid="summary-duration">{summary.durationLabel}</dd>
        </div>
        <div className="flex justify-between border-b border-lc-line pb-2">
          <dt className="text-lc-slate">Caller questions</dt>
          <dd className="font-medium text-lc-ink" data-testid="summary-questions">{summary.questionCount}</dd>
        </div>
        <div className="flex justify-between border-b border-lc-line pb-2">
          <dt className="text-lc-slate">Escalation recommended</dt>
          <dd className="font-medium text-lc-ink" data-testid="summary-escalation">{summary.escalationRecommended ? "Yes" : "No"}</dd>
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
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-lc-blue underline">
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
      <button type="button" onClick={onRestart} className="mt-6 w-full rounded-md bg-lc-blue px-4 py-2 text-sm font-semibold text-white hover:bg-lc-blue-dark">
        Start a new simulated call
      </button>
      <SimulationBadge />
    </section>
  );
}

function DeclinedScreen({ onRestart }: { readonly onRestart: () => void }) {
  return (
    <section aria-labelledby="declined-title" className="rounded-2xl border border-lc-line bg-white p-6 text-center shadow-sm">
      <h1 id="declined-title" className="text-lg font-bold text-lc-ink">
        Call declined
      </h1>
      <p className="mt-2 text-sm text-lc-slate">No call was placed. You can start a new simulated call at any time.</p>
      <button type="button" onClick={onRestart} className="mt-6 w-full rounded-md bg-lc-blue px-4 py-2 text-sm font-semibold text-white hover:bg-lc-blue-dark">
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
