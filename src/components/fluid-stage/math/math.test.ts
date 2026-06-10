import { describe, expect, test } from 'vitest';

import { clampDt, fitResolution, hsvToRGB, idleFadeWeight, lissajousPointer, pointerDeltaToUVVelocity, sabiPalette, wrap01 } from '.';

describe('clampDt', () => {
  test('converts milliseconds to seconds within range', () => {
    expect(clampDt(16.6667)).toBeCloseTo(0.0166667, 5);
  });

  test('clamps large frame gaps to 1/30s', () => {
    expect(clampDt(1000)).toBeCloseTo(1 / 30, 6);
  });

  test('clamps tiny frame gaps to 1/120s', () => {
    expect(clampDt(0.5)).toBeCloseTo(1 / 120, 6);
  });

  test('treats non-finite input as 1/60s', () => {
    expect(clampDt(Number.NaN)).toBeCloseTo(1 / 60, 6);
  });
});

describe('fitResolution', () => {
  test('divides canvas size by divisor', () => {
    expect(fitResolution(2048, 1024, 4, 1024)).toEqual({ width: 512, height: 256 });
  });

  test('caps the long edge while preserving aspect', () => {
    expect(fitResolution(4096, 2048, 1, 1024)).toEqual({ width: 1024, height: 512 });
  });

  test('caps the long edge when canvas is portrait', () => {
    expect(fitResolution(1000, 2000, 1, 500)).toEqual({ width: 250, height: 500 });
  });

  test('never returns dimensions below 1', () => {
    expect(fitResolution(2, 2, 4, 1024)).toEqual({ width: 1, height: 1 });
  });

  test('returns integers for fractional inputs', () => {
    const result = fitResolution(1366, 768, 4, 1024);
    expect(Number.isInteger(result.width)).toBe(true);
    expect(Number.isInteger(result.height)).toBe(true);
  });
});

describe('pointerDeltaToUVVelocity', () => {
  test('converts pixel delta to uv-per-second velocity', () => {
    const v = pointerDeltaToUVVelocity({
      dxPx: 100,
      dyPx: 50,
      dtSeconds: 0.1,
      canvasWidth: 1000,
      canvasHeight: 500,
    });
    expect(v.x).toBeCloseTo(1, 6);
    expect(v.y).toBeCloseTo(1, 6);
  });

  test('clamps magnitude to avoid explosive splats', () => {
    const v = pointerDeltaToUVVelocity({
      dxPx: 100_000,
      dyPx: 0,
      dtSeconds: 0.001,
      canvasWidth: 100,
      canvasHeight: 100,
    });
    expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(6.000001);
  });

  test('returns zero for zero delta', () => {
    const v = pointerDeltaToUVVelocity({
      dxPx: 0,
      dyPx: 0,
      dtSeconds: 0.016,
      canvasWidth: 800,
      canvasHeight: 600,
    });
    expect(v).toEqual({ x: 0, y: 0 });
  });
});

describe('lissajousPointer', () => {
  test('stays inside the unit square', () => {
    for (const t of [0, 0.7, 2.3, 9.1, 33.3]) {
      for (const index of [0, 1]) {
        const p = lissajousPointer(t, index);
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(1);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(1);
      }
    }
  });

  test('velocity matches the numerical derivative of position', () => {
    const h = 1e-4;
    const t = 4.2;
    const before = lissajousPointer(t, 0);
    const after = lissajousPointer(t + h, 0);
    expect((after.x - before.x) / h).toBeCloseTo(before.vx, 2);
    expect((after.y - before.y) / h).toBeCloseTo(before.vy, 2);
  });

  test('different indices trace different paths', () => {
    const a = lissajousPointer(1.5, 0);
    const b = lissajousPointer(1.5, 1);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.01);
  });
});

describe('idleFadeWeight', () => {
  test('is zero before the idle threshold', () => {
    expect(idleFadeWeight(0)).toBe(0);
    expect(idleFadeWeight(3.4)).toBe(0);
  });

  test('fades in linearly over one second after the threshold', () => {
    expect(idleFadeWeight(4)).toBeCloseTo(0.5, 6);
  });

  test('saturates at one', () => {
    expect(idleFadeWeight(4.5)).toBe(1);
    expect(idleFadeWeight(100)).toBe(1);
  });
});

describe('hsvToRGB', () => {
  test('hue 0 is red', () => {
    expect(hsvToRGB(0, 1, 1)).toEqual({ r: 1, g: 0, b: 0 });
  });

  test('hue 1/3 is green', () => {
    const c = hsvToRGB(1 / 3, 1, 1);
    expect(c.r).toBeCloseTo(0, 6);
    expect(c.g).toBeCloseTo(1, 6);
    expect(c.b).toBeCloseTo(0, 6);
  });

  test('hue 0.5 is cyan', () => {
    const c = hsvToRGB(0.5, 1, 1);
    expect(c.r).toBeCloseTo(0, 6);
    expect(c.g).toBeCloseTo(1, 6);
    expect(c.b).toBeCloseTo(1, 6);
  });

  test('zero saturation is gray at the given value', () => {
    expect(hsvToRGB(0.77, 0, 0.5)).toEqual({ r: 0.5, g: 0.5, b: 0.5 });
  });

  test('hue wraps beyond one', () => {
    const c = hsvToRGB(1.5, 1, 1);
    const reference = hsvToRGB(0.5, 1, 1);
    expect(c.r).toBeCloseTo(reference.r, 6);
    expect(c.g).toBeCloseTo(reference.g, 6);
    expect(c.b).toBeCloseTo(reference.b, 6);
  });
});

describe('sabiPalette', () => {
  test('returns channels within [0,1]', () => {
    for (const t of [0, 0.1, 0.33, 0.5, 0.77, 0.999]) {
      const c = sabiPalette(t);
      for (const channel of [c.r, c.g, c.b]) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
      }
    }
  });

  test('is periodic across the unit interval', () => {
    const a = sabiPalette(0.2);
    const b = sabiPalette(1.2);
    expect(b.r).toBeCloseTo(a.r, 6);
    expect(b.g).toBeCloseTo(a.g, 6);
    expect(b.b).toBeCloseTo(a.b, 6);
  });

  test('moves through distinct muted hues', () => {
    const rust = sabiPalette(0);
    const verdigris = sabiPalette(0.4);
    expect(Math.abs(rust.r - verdigris.r) + Math.abs(rust.g - verdigris.g)).toBeGreaterThan(0.1);
  });

  test('stays muted — never fully saturated primaries', () => {
    for (const t of [0, 0.2, 0.4, 0.6, 0.8]) {
      const c = sabiPalette(t);
      const maxC = Math.max(c.r, c.g, c.b);
      const minC = Math.min(c.r, c.g, c.b);
      expect(maxC).toBeLessThanOrEqual(0.75);
      expect(maxC - minC).toBeLessThan(0.5);
    }
  });
});

describe('wrap01', () => {
  test('wraps values above one', () => {
    expect(wrap01(1.25)).toBeCloseTo(0.25, 6);
  });

  test('wraps negative values into [0, 1)', () => {
    expect(wrap01(-0.25)).toBeCloseTo(0.75, 6);
  });

  test('keeps in-range values untouched', () => {
    expect(wrap01(0.5)).toBe(0.5);
  });
});
