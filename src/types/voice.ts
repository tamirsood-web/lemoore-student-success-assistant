// Voice-interaction seam types (INTERFACES ONLY — no telephony is implemented yet).
//
// These describe how a future voice channel would plug into the assistant WITHOUT changing
// the chat UI or the /api/chat contract. A voice turn is just: audio-in → text → the same
// grounded answer pipeline → text → audio-out. Concrete implementations (Amazon Transcribe
// for STT, Amazon Polly for TTS, Amazon Connect for telephony) satisfy these seams later;
// see docs/INTEGRATIONS.md. Nothing here calls a network or AWS service.

/** A chunk or stream of audio input, kept opaque so any transport can satisfy it. */
export type AudioInput = {
  /** Raw audio bytes (e.g. PCM/WAV/Opus); encoding is described by `mimeType`. */
  readonly data: ArrayBuffer;
  readonly mimeType: string;
  /** Sample rate in Hz, when known (e.g. 8000 for telephony, 16000 for wideband). */
  readonly sampleRateHz?: number;
  /** BCP-47 language tag hint (e.g. "en-US"). */
  readonly languageCode?: string;
};

/** Synthesized speech output produced from assistant answer text. */
export type AudioOutput = {
  readonly data: ArrayBuffer;
  readonly mimeType: string;
};

/** Result of transcribing audio to text. */
export type TranscriptionResult = {
  readonly text: string;
  /** Provider confidence in [0, 1] when available; advisory only. */
  readonly confidence?: number;
  /** False while a streaming utterance is still in progress. */
  readonly isFinal: boolean;
};

/**
 * Speech-to-text seam. A future Amazon Transcribe implementation fulfils this; the demo has
 * no implementation yet. Implementations MUST treat transcribed text as untrusted user
 * input — it flows into the same guardrail/retrieval pipeline as typed text.
 */
export interface SpeechToTextProvider {
  readonly name: string;
  transcribe(audio: AudioInput): Promise<TranscriptionResult>;
}

/**
 * Text-to-speech seam. A future Amazon Polly implementation fulfils this. Only assistant
 * answer text (already grounded and safety-checked) should be synthesized — never raw
 * system prompts or internal context.
 */
export interface TextToSpeechProvider {
  readonly name: string;
  synthesize(text: string, options?: {
    readonly voiceId?: string;
    readonly languageCode?: string;
  }): Promise<AudioOutput>;
}

/** One turn of a voice conversation, mirroring a single chat request/response. */
export type VoiceTurn = {
  readonly transcript: string;
  /** Assistant answer text for this turn (the same text shown in chat). */
  readonly answer: string;
};

/**
 * A stateful voice session. Correlates to a phone call or a browser voice widget. It holds
 * only what a chat conversation would; it stores no raw audio and no sensitive identifiers
 * beyond what the existing redaction/guardrail rules already permit.
 */
export interface VoiceSession {
  readonly sessionId: string;
  readonly startedAt: string;
  readonly turns: readonly VoiceTurn[];
}

/**
 * Orchestrates a voice turn end-to-end by composing the STT/TTS seams with the EXISTING
 * grounded-answer pipeline (POST /api/chat). This is the single seam a telephony bridge
 * (e.g. Amazon Connect) would call; the chat UI and answer contract are untouched.
 */
export interface VoiceConversationService {
  startSession(): Promise<VoiceSession>;
  /** audio-in → transcribe → grounded answer → synthesize → audio-out. */
  handleTurn(
    session: VoiceSession,
    audio: AudioInput,
  ): Promise<{ readonly session: VoiceSession; readonly audio: AudioOutput }>;
  endSession(session: VoiceSession): Promise<void>;
}
