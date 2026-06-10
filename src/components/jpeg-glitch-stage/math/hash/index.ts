// lowbias32 integer hash (https://nullprogram.com/blog/2018/07/31/).
// Mirrors hash_u32 / hash_combine / hash01 in engine/shaders/common.wgsl —
// keep both sides in sync.

export const hashU32 = (value: number): number => {
  const input = value >>> 0;
  const a = (input ^ (input >>> 16)) >>> 0;
  const b = Math.imul(a, 0x7feb352d) >>> 0;
  const c = (b ^ (b >>> 15)) >>> 0;
  const d = Math.imul(c, 0x846ca68b) >>> 0;

  return (d ^ (d >>> 16)) >>> 0;
};

export const hashCombine = (a: number, b: number): number => hashU32((a >>> 0) ^ (Math.imul(b >>> 0, 0x9e3779b9) >>> 0));

export const hash01 = (value: number): number => (hashU32(value) & 0xffffff) / 16777216;
