// Per-block prefix of the "broken bytes" event stream, computed on the CPU and
// uploaded as a storage buffer. JPEG entropy coding is raster-ordered with no
// resync (we model no restart markers), so a break corrupts everything after
// it. Each block stores vec4(count, driftY, driftCb, driftCr): how many breaks
// happened at or before it, and the accumulated DC random walk — with many
// breaks the chroma walk saturates into the flat acid-color fields of a truly
// shredded JPEG.

import { hash01, hashCombine } from '../hash';

export type BreakStreamInput = {
  /** Number of corrupted "bytes" (break events). */
  brokenBytes: number;
  /** 0–100: stream fraction where breaks may start. */
  glitchStart: number;
  /** 0–100: stream fraction where breaks end. */
  glitchEnd: number;
  seed: number;
  blocksX: number;
  blocksY: number;
};

const MAX_EVENTS = 8192;

// DC walk step sizes per break (Y, Cb, Cr) in coefficient units (DC spans ±4).
const STEP_Y = 1.0;
const STEP_C = 0.9;

export const buildBreakStream = (input: BreakStreamInput): Float32Array<ArrayBuffer> => {
  const total = input.blocksX * input.blocksY;
  const result = new Float32Array(total * 4);
  const events = Math.max(0, Math.min(MAX_EVENTS, Math.round(input.brokenBytes)));
  if (events === 0 || total === 0) return result;

  const lo = Math.min(input.glitchStart, input.glitchEnd) / 100;
  const hi = Math.max(input.glitchStart, input.glitchEnd) / 100;
  const first = Math.min(total - 1, Math.floor(lo * total));
  const span = Math.max(1, Math.floor(hi * total) - first);

  const deltas = new Float32Array(total * 4);
  for (const event of Array.from({ length: events }, (_, index) => index)) {
    const handle = hashCombine(event + 1, (input.seed ^ 0xb5e3) >>> 0);
    const position = Math.min(total - 1, first + (handle % span));
    const mix = hashCombine(handle, 0x9d2c);
    deltas[position * 4] = (deltas[position * 4] ?? 0) + 1;
    deltas[position * 4 + 1] = (deltas[position * 4 + 1] ?? 0) + (hash01(mix) - 0.5) * STEP_Y;
    deltas[position * 4 + 2] = (deltas[position * 4 + 2] ?? 0) + (hash01(mix ^ 0x68bc) - 0.5) * STEP_C;
    deltas[position * 4 + 3] = (deltas[position * 4 + 3] ?? 0) + (hash01(mix ^ 0x51ed) - 0.5) * STEP_C;
  }

  const running = { count: 0, y: 0, cb: 0, cr: 0 };
  for (const block of Array.from({ length: total }, (_, index) => index)) {
    running.count = running.count + (deltas[block * 4] ?? 0);
    running.y = running.y + (deltas[block * 4 + 1] ?? 0);
    running.cb = running.cb + (deltas[block * 4 + 2] ?? 0);
    running.cr = running.cr + (deltas[block * 4 + 3] ?? 0);
    result[block * 4] = running.count;
    result[block * 4 + 1] = running.y;
    result[block * 4 + 2] = running.cb;
    result[block * 4 + 3] = running.cr;
  }

  return result;
};
