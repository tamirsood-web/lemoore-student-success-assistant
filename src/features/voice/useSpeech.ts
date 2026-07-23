"use client";

// Thin, dependency-free wrapper over the browser Web Speech API (speech synthesis +
// recognition). Everything is capability-detected and wrapped in try/catch so the call UI
// degrades gracefully when the API is missing (e.g. Firefox recognition, jsdom in tests) or
// microphone permission is denied. No third-party voice SDK is used.

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal shapes for the non-standard SpeechRecognition API (not in the DOM lib typings).
type RecognitionResultLike = { readonly transcript?: string };
type RecognitionEvent = {
  readonly results?: ArrayLike<ArrayLike<RecognitionResultLike>>;
};
type RecognitionErrorEvent = { readonly error?: string };
interface MinimalRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type RecognitionConstructor = new () => MinimalRecognition;

function getRecognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function ttsAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

/** Microphone / recognition status surfaced to the UI. */
export type MicStatus = "idle" | "listening" | "denied" | "unsupported";

export type SpeechApi = {
  readonly ttsSupported: boolean;
  readonly sttSupported: boolean;
  readonly micStatus: MicStatus;
  readonly speak: (text: string, opts?: { onEnd?: () => void }) => void;
  readonly cancelSpeech: () => void;
  readonly startListening: (handlers: {
    onResult: (text: string) => void;
    onError?: (status: MicStatus) => void;
  }) => void;
  readonly stopListening: () => void;
};

export function useSpeech(): SpeechApi {
  const [ttsSupported] = useState(ttsAvailable);
  const [sttSupported] = useState(() => Boolean(getRecognitionConstructor()));
  const [micStatus, setMicStatus] = useState<MicStatus>(() =>
    getRecognitionConstructor() ? "idle" : "unsupported",
  );
  const recognitionRef = useRef<MinimalRecognition | null>(null);

  const cancelSpeech = useCallback(() => {
    if (!ttsAvailable()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore — best-effort */
    }
  }, []);

  const speak = useCallback((text: string, opts?: { onEnd?: () => void }) => {
    if (!ttsAvailable() || !text.trim()) {
      opts?.onEnd?.();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => opts?.onEnd?.();
      utterance.onerror = () => opts?.onEnd?.();
      window.speechSynthesis.speak(utterance);
    } catch {
      opts?.onEnd?.();
    }
  }, []);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    setMicStatus((s) => (s === "listening" ? "idle" : s));
  }, []);

  const startListening = useCallback(
    (handlers: { onResult: (text: string) => void; onError?: (status: MicStatus) => void }) => {
      const Ctor = getRecognitionConstructor();
      if (!Ctor) {
        setMicStatus("unsupported");
        handlers.onError?.("unsupported");
        return;
      }
      try {
        const rec = new Ctor();
        rec.lang = "en-US";
        rec.continuous = false;
        rec.interimResults = false;
        rec.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript ?? "";
          if (transcript.trim()) handlers.onResult(transcript.trim());
        };
        rec.onerror = (event) => {
          const denied = event.error === "not-allowed" || event.error === "service-not-allowed";
          const status: MicStatus = denied ? "denied" : "idle";
          setMicStatus(status);
          handlers.onError?.(status);
        };
        rec.onend = () => {
          recognitionRef.current = null;
          setMicStatus((s) => (s === "listening" ? "idle" : s));
        };
        recognitionRef.current = rec;
        setMicStatus("listening");
        rec.start();
      } catch {
        setMicStatus("denied");
        handlers.onError?.("denied");
      }
    },
    [],
  );

  // Clean up any in-flight speech/recognition on unmount.
  useEffect(() => () => {
    stopListening();
    cancelSpeech();
  }, [stopListening, cancelSpeech]);

  return { ttsSupported, sttSupported, micStatus, speak, cancelSpeech, startListening, stopListening };
}
