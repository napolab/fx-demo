import { hashCombine } from '../hash';

// JPEG Annex K base quantization tables + IJG quality scaling.
// Entries are emitted in 0..1 units (divided by 255) because the GPU pipeline
// runs the DCT on 0..1 YCbCr signals instead of JPEG's 0..255.

export const BASE_LUMA_TABLE: readonly number[] = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
];

export const BASE_CHROMA_TABLE: readonly number[] = [
  17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99,
];

const clampQuality = (quality: number): number => Math.min(100, Math.max(1, Math.round(quality)));

const scaleEntry = (base: number, scale: number): number => {
  const scaled = Math.floor((base * scale + 50) / 100);

  return Math.min(255, Math.max(1, scaled)) / 255;
};

export const scaledQuantTables = (quality: number): Float32Array<ArrayBuffer> => {
  const clamped = clampQuality(quality);
  const scale = clamped < 50 ? 5000 / clamped : 200 - 2 * clamped;
  const entries = [...BASE_LUMA_TABLE, ...BASE_CHROMA_TABLE].map((base) => scaleEntry(base, scale));

  return new Float32Array(entries);
};

// The aescripts plugin's "breaking bytes" control: replace `count` of the 64
// entries in each table (count * 2 picks across the packed 128) with
// seed-deterministic random values in 1..maxRandom. Corrupting the table itself
// produces ringing and frequency-banded stripes that quality scaling alone can
// never make.
export const corruptQuantTables = (tables: Float32Array<ArrayBuffer>, count: number, maxRandom: number, seed: number): Float32Array<ArrayBuffer> => {
  const picks = Math.max(0, Math.min(64, Math.round(count))) * 2;
  if (picks === 0) return new Float32Array(tables);

  const ceiling = Math.max(1, Math.min(255, Math.round(maxRandom)));
  const result = new Float32Array(tables);
  for (const pick of Array.from({ length: picks }, (_, index) => index)) {
    const slot = hashCombine(seed + 1, pick * 2 + 1) % 128;
    const step = (1 + (hashCombine(seed + 1, pick * 2 + 2) % ceiling)) / 255;
    result[slot] = step;
  }

  return result;
};

// The plugin's "QTC position / QTC value" control: overwrite one of the 64
// table entries (same slot in luma and chroma) with an explicit value.
// value 0 = override off.
export const applyQTCOverride = (tables: Float32Array<ArrayBuffer>, position: number, value: number): Float32Array<ArrayBuffer> => {
  const result = new Float32Array(tables);
  const step = Math.min(255, Math.round(value));
  if (step <= 0) return result;

  const slot = Math.max(1, Math.min(64, Math.round(position))) - 1;
  result[slot] = step / 255;
  result[slot + 64] = step / 255;

  return result;
};
