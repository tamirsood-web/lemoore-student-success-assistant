"use client";

// Browser transport + audio pipeline for the Nova 2 Sonic voice call. Connects to the LOCAL
// bridge WebSocket (never Bedrock directly), captures the mic via an AudioWorklet (→16 kHz PCM),
// plays Nova's 24 kHz PCM through an ordered playback worklet, and relays typed text + mute +
// end. Everything is capability-detected and wrapped in try/catch so it degrades to a labeled
// text-only fallback when the bridge/mic/Web Audio API is unavailable. No AWS is ever contacted
// from the browser; the only public config is the local ws URL.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  int16ToBase64,
  base64ToInt16,
  pcm16ToFloat,
  resampleFloat32,
  AUDIO_OUTPUT_SAMPLE_RATE,
  type BridgeMessage,
} from "@/lib/nova-sonic";

const WS_URL = process.env.NEXT_PUBLIC_NOVA_SONIC_WS_URL;

export type NovaUnavailableReason = "unsupported" | "mic-denied" | "ws-error";

export type NovaDiagnostics = {
  readonly wsConnected: boolean;
  readonly novaActive: boolean;
  readonly micActive: boolean;
  readonly queueSamples: number;
};

export type NovaHandlers = {
  readonly onMessage: (message: BridgeMessage) => void;
  readonly onUnavailable: (reason: NovaUnavailableReason) => void;
  readonly onDiagnostics?: (diag: NovaDiagnostics) => void;
};

function browserSupportsVoice(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.WebSocket !== "undefined" &&
    typeof window.AudioContext !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export type NovaSonicApi = {
  /** True when the local ws URL is configured and the browser can do Web Audio + WebSocket. */
  readonly available: boolean;
  readonly connect: (handlers: NovaHandlers) => Promise<void>;
  readonly sendText: (text: string) => void;
  readonly setMuted: (muted: boolean) => void;
  readonly end: () => void;
};

export function useNovaSonic(): NovaSonicApi {
  const [available] = useState(() => Boolean(WS_URL) && browserSupportsVoice());
  const wsRef = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micNodeRef = useRef<AudioWorkletNode | null>(null);
  const playbackRef = useRef<AudioWorkletNode | null>(null);
  const diagRef = useRef<NovaDiagnostics>({ wsConnected: false, novaActive: false, micActive: false, queueSamples: 0 });
  const handlersRef = useRef<NovaHandlers | null>(null);

  const emitDiag = useCallback((patch: Partial<NovaDiagnostics>) => {
    diagRef.current = { ...diagRef.current, ...patch };
    handlersRef.current?.onDiagnostics?.(diagRef.current);
  }, []);

  const cleanup = useCallback(() => {
    try {
      micNodeRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      playbackRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    micNodeRef.current = null;
    playbackRef.current = null;
    streamRef.current?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* ignore */
      }
    });
    streamRef.current = null;
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx && ctx.state !== "closed") void ctx.close().catch(() => undefined);
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
    emitDiag({ wsConnected: false, novaActive: false, micActive: false, queueSamples: 0 });
  }, [emitDiag]);

  const playAudio = useCallback((base64: string) => {
    const ctx = ctxRef.current;
    const node = playbackRef.current;
    if (!ctx || !node) return;
    try {
      const pcm = base64ToInt16(base64);
      const float = pcm16ToFloat(pcm);
      const resampled = resampleFloat32(float, AUDIO_OUTPUT_SAMPLE_RATE, ctx.sampleRate);
      node.port.postMessage(resampled, [resampled.buffer]);
    } catch {
      /* drop a bad audio frame rather than crash */
    }
  }, []);

  const connect = useCallback(
    async (handlers: NovaHandlers) => {
      handlersRef.current = handlers;
      if (!available || !WS_URL) {
        handlers.onUnavailable("unsupported");
        return;
      }
      // 1) Microphone permission.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        handlers.onUnavailable("mic-denied");
        return;
      }
      streamRef.current = stream;

      // 2) WebSocket to the local bridge.
      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        cleanup();
        handlers.onUnavailable("ws-error");
        return;
      }
      wsRef.current = ws;

      ws.onopen = async () => {
        emitDiag({ wsConnected: true });
        try {
          const ctx = new AudioContext();
          ctxRef.current = ctx;
          await ctx.audioWorklet.addModule("/audio-worklets/mic-capture-worklet.js");
          await ctx.audioWorklet.addModule("/audio-worklets/playback-worklet.js");

          const source = ctx.createMediaStreamSource(stream);
          const micNode = new AudioWorkletNode(ctx, "mic-capture");
          micNode.port.onmessage = (e) => {
            const buffer = e.data as ArrayBuffer;
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ t: "audio", data: int16ToBase64(new Int16Array(buffer)) }));
            }
          };
          // Keep the mic node pulled without routing mic audio to the speakers (no feedback).
          const silent = ctx.createGain();
          silent.gain.value = 0;
          source.connect(micNode).connect(silent).connect(ctx.destination);
          micNodeRef.current = micNode;

          const playback = new AudioWorkletNode(ctx, "nova-playback", { outputChannelCount: [1] });
          playback.port.onmessage = (e) => {
            if (e.data?.type === "queue") emitDiag({ queueSamples: e.data.samples });
          };
          playback.connect(ctx.destination);
          playbackRef.current = playback;

          emitDiag({ micActive: true, novaActive: true });
          ws.send(JSON.stringify({ t: "start" }));
        } catch {
          cleanup();
          handlers.onUnavailable("ws-error");
        }
      };

      ws.onmessage = (event) => {
        let message: BridgeMessage;
        try {
          message = JSON.parse(typeof event.data === "string" ? event.data : "") as BridgeMessage;
        } catch {
          return;
        }
        if (message.t === "audio") {
          playAudio(message.data);
          return;
        }
        if (message.t === "interruption") {
          playbackRef.current?.port.postMessage({ type: "flush" });
        }
        if (message.t === "ended") {
          handlers.onMessage(message);
          cleanup();
          return;
        }
        handlers.onMessage(message);
      };

      ws.onerror = () => {
        handlers.onUnavailable("ws-error");
      };
      ws.onclose = () => {
        emitDiag({ wsConnected: false, novaActive: false });
      };
    },
    [available, cleanup, emitDiag, playAudio],
  );

  const sendText = useCallback((text: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: "text", data: text }));
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    micNodeRef.current?.port.postMessage({ type: "mute", value: muted });
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: "mute", value: muted }));
    emitDiag({ micActive: !muted && Boolean(streamRef.current) });
  }, [emitDiag]);

  const end = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ t: "end" }));
      } catch {
        /* ignore */
      }
    }
    cleanup();
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { available, connect, sendText, setMuted, end };
}
