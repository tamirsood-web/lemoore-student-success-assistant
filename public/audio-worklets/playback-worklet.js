// Nova playback AudioWorklet: an ordered Float32 sample queue played at the AudioContext rate.
// The main thread decodes Nova's 24 kHz LPCM, resamples to the context rate, and posts Float32
// chunks here. On underrun it outputs silence (no clicks); a "flush" message clears the queue
// instantly for barge-in/interruption. Runs in AudioWorklet scope (no imports).

class NovaPlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._queue = [];
    this._current = null;
    this._pos = 0;
    this._queuedSamples = 0;
    this.port.onmessage = (e) => {
      const data = e.data;
      if (data && data.type === "flush") {
        this._queue = [];
        this._current = null;
        this._pos = 0;
        this._queuedSamples = 0;
        return;
      }
      if (data instanceof Float32Array) {
        this._queue.push(data);
        this._queuedSamples += data.length;
      }
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0] && outputs[0][0];
    if (!output) return true;
    for (let i = 0; i < output.length; i += 1) {
      if (!this._current || this._pos >= this._current.length) {
        this._current = this._queue.shift() || null;
        this._pos = 0;
      }
      if (this._current) {
        output[i] = this._current[this._pos];
        this._pos += 1;
        this._queuedSamples = Math.max(0, this._queuedSamples - 1);
      } else {
        output[i] = 0; // underrun protection
      }
    }
    // Periodically report queue depth for the dev diagnostics panel.
    if ((currentFrame ?? 0) % 4800 === 0) {
      this.port.postMessage({ type: "queue", samples: this._queuedSamples });
    }
    return true;
  }
}

registerProcessor("nova-playback", NovaPlaybackProcessor);
