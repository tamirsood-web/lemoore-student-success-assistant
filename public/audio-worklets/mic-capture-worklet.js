// Mic-capture AudioWorklet: downsamples the microphone (device sample rate) to 16 kHz mono and
// converts Float32 → signed Int16 PCM, posting Int16 buffers to the main thread for streaming to
// the Nova bridge. Runs in AudioWorklet scope (no imports); mirrors src/lib/nova-sonic/audio.ts.

const TARGET_RATE = 16000;

class MicCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._ratio = sampleRate / TARGET_RATE; // `sampleRate` is a worklet global
    this._acc = [];
    // Emit ~50 ms of 16 kHz audio per message.
    this._minInputSamples = Math.ceil(this._ratio * TARGET_RATE * 0.05);
    this._muted = false;
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === "mute") this._muted = Boolean(e.data.value);
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    if (this._muted) return true;
    const channel = input[0];
    for (let i = 0; i < channel.length; i += 1) this._acc.push(channel[i]);

    if (this._acc.length >= this._minInputSamples) {
      const inArr = this._acc;
      this._acc = [];
      const outLen = Math.floor(inArr.length / this._ratio);
      const pcm = new Int16Array(outLen);
      for (let i = 0; i < outLen; i += 1) {
        const pos = i * this._ratio;
        const i0 = Math.floor(pos);
        const i1 = Math.min(i0 + 1, inArr.length - 1);
        const frac = pos - i0;
        const s = inArr[i0] * (1 - frac) + inArr[i1] * frac;
        const c = s < -1 ? -1 : s > 1 ? 1 : s;
        pcm[i] = c < 0 ? c * 0x8000 : c * 0x7fff;
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}

registerProcessor("mic-capture", MicCaptureProcessor);
