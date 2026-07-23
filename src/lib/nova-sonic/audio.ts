// Pure audio DSP for Nova 2 Sonic LPCM (no DOM, no I/O) — the tested reference implementation.
//
// Mic capture (browser) is Float32 at the device rate; Nova wants 16 kHz mono signed 16-bit
// PCM. Nova output is 24 kHz mono signed 16-bit PCM to play back. These helpers do the
// resampling and Float32↔Int16 conversion; the AudioWorklets mirror this logic in worklet scope.

/** Linear-interpolation resample of mono Float32 samples from `inRate` to `outRate`. */
export function resampleFloat32(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (inRate === outRate || input.length === 0) return input.slice();
  const ratio = inRate / outRate;
  const outLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const srcPos = i * ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = srcPos - i0;
    output[i] = (input[i0] ?? 0) * (1 - frac) + (input[i1] ?? 0) * frac;
  }
  return output;
}

/** Convert Float32 samples in [-1, 1] to signed 16-bit PCM (clamped). */
export function floatToPcm16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const s = Math.max(-1, Math.min(1, input[i] ?? 0));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Convert signed 16-bit PCM to Float32 samples in [-1, 1]. */
export function pcm16ToFloat(input: Int16Array): Float32Array {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const v = input[i] ?? 0;
    out[i] = v < 0 ? v / 0x8000 : v / 0x7fff;
  }
  return out;
}

/** Base64-encode Int16 PCM (little-endian). Works in Node (Buffer) and browsers (btoa). */
export function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i] ?? 0);
  return btoa(binary);
}

/** Decode base64 LPCM bytes into an Int16Array (little-endian). */
export function base64ToInt16(base64: string): Int16Array {
  let bytes: Uint8Array;
  if (typeof Buffer !== "undefined") {
    bytes = new Uint8Array(Buffer.from(base64, "base64"));
  } else {
    const binary = atob(base64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  }
  // Ensure even byte length before viewing as Int16.
  const usable = bytes.byteLength - (bytes.byteLength % 2);
  return new Int16Array(bytes.buffer, bytes.byteOffset, usable / 2);
}

/** Estimate the decoded byte length of a base64 string without allocating. */
export function base64DecodedByteLength(base64: string): number {
  const len = base64.length;
  if (len === 0) return 0;
  let padding = 0;
  if (base64.endsWith("==")) padding = 2;
  else if (base64.endsWith("=")) padding = 1;
  return Math.floor((len * 3) / 4) - padding;
}
