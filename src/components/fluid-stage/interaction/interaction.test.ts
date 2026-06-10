import { describe, expect, test } from 'vitest';

import { drainSplats, idleSplats, releasePointer, trackPointerDown, trackPointerMove } from '.';

const SIZE = { width: 1000, height: 500 };
const DRAIN_OPTS = { dtSeconds: 1 / 60, canvasWidth: SIZE.width, canvasHeight: SIZE.height, hueBase: 0 };

const move = (id: number, x: number, y: number) => ({ pointerId: id, offsetX: x, offsetY: y });

describe('trackPointerMove / drainSplats', () => {
  test('a moved pointer produces one splat with its accumulated velocity', () => {
    const t1 = trackPointerMove({}, move(1, 100, 100), SIZE);
    const t2 = trackPointerMove(t1, move(1, 130, 100), SIZE);
    const { splats } = drainSplats(t2, DRAIN_OPTS);

    expect(splats).toHaveLength(1);
    const [splat] = splats;
    expect(splat?.x).toBeCloseTo(0.13, 6);
    expect(splat?.y).toBeCloseTo(0.2, 6);
    expect(splat?.vx).toBeGreaterThan(0);
    expect(splat?.vy).toBeCloseTo(0, 6);
  });

  test('the first sample of an unknown pointer produces no splat', () => {
    const t1 = trackPointerMove({}, move(7, 500, 250), SIZE);
    const { splats } = drainSplats(t1, DRAIN_OPTS);
    expect(splats).toHaveLength(0);
  });

  test('draining resets accumulated deltas', () => {
    const t1 = trackPointerMove({}, move(1, 100, 100), SIZE);
    const t2 = trackPointerMove(t1, move(1, 200, 200), SIZE);
    const first = drainSplats(t2, DRAIN_OPTS);
    const second = drainSplats(first.tracks, DRAIN_OPTS);

    expect(first.splats).toHaveLength(1);
    expect(second.splats).toHaveLength(0);
  });

  test('a held pointer stirs harder than a hovering one', () => {
    const hover1 = trackPointerMove({}, move(1, 100, 100), SIZE);
    const hover2 = trackPointerMove(hover1, move(1, 150, 100), SIZE);
    const hoverSplat = drainSplats(hover2, DRAIN_OPTS).splats[0];

    const down1 = trackPointerDown({}, move(2, 100, 100), SIZE);
    const drained = drainSplats(down1, DRAIN_OPTS);
    const down2 = trackPointerMove(drained.tracks, move(2, 150, 100), SIZE);
    const downSplat = drainSplats(down2, DRAIN_OPTS).splats[0];

    expect(hoverSplat).toBeDefined();
    expect(downSplat).toBeDefined();
    if (hoverSplat === undefined || downSplat === undefined) return;
    expect(downSplat.strength).toBeGreaterThan(hoverSplat.strength);
  });

  test('pointer down produces an immediate burst splat with a larger radius', () => {
    const t1 = trackPointerDown({}, move(3, 500, 250), SIZE);
    const { splats } = drainSplats(t1, DRAIN_OPTS);

    expect(splats).toHaveLength(1);
    const [burst] = splats;
    const hoverTracks = trackPointerMove(trackPointerMove({}, move(4, 100, 100), SIZE), move(4, 150, 100), SIZE);
    const hoverSplat = drainSplats(hoverTracks, DRAIN_OPTS).splats[0];
    expect(burst).toBeDefined();
    expect(hoverSplat).toBeDefined();
    if (burst === undefined || hoverSplat === undefined) return;
    expect(burst.radius).toBeGreaterThan(hoverSplat.radius);
    expect(burst.dyeAmount).toBeGreaterThan(hoverSplat.dyeAmount);
  });

  test('pointer down bursts carry a radial impulse, hovering does not', () => {
    const burstTracks = trackPointerDown({}, move(8, 500, 250), SIZE);
    const burst = drainSplats(burstTracks, DRAIN_OPTS).splats[0];

    const hoverTracks = trackPointerMove(trackPointerMove({}, move(9, 100, 100), SIZE), move(9, 150, 100), SIZE);
    const hover = drainSplats(hoverTracks, DRAIN_OPTS).splats[0];

    expect(burst).toBeDefined();
    expect(hover).toBeDefined();
    if (burst === undefined || hover === undefined) return;
    expect(burst.radialImpulse).toBeGreaterThan(0);
    expect(hover.radialImpulse).toBe(0);
  });

  test('released pointers stop producing splats', () => {
    const t1 = trackPointerDown({}, move(5, 100, 100), SIZE);
    const t2 = releasePointer(t1, 5);
    const { splats } = drainSplats(t2, DRAIN_OPTS);
    expect(splats).toHaveLength(0);
  });

  test('multiple pointers each produce their own splat', () => {
    const a1 = trackPointerMove({}, move(1, 100, 100), SIZE);
    const a2 = trackPointerMove(a1, move(1, 150, 120), SIZE);
    const b1 = trackPointerMove(a2, move(2, 700, 400), SIZE);
    const b2 = trackPointerMove(b1, move(2, 650, 380), SIZE);
    const { splats } = drainSplats(b2, DRAIN_OPTS);
    expect(splats).toHaveLength(2);
  });

  test('splat dye colors stay within [0,1]', () => {
    const t1 = trackPointerDown({}, move(6, 300, 200), SIZE);
    const { splats } = drainSplats(t1, { ...DRAIN_OPTS, hueBase: 0.42 });
    for (const splat of splats) {
      for (const channel of [splat.dyeR, splat.dyeG, splat.dyeB]) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('idleSplats', () => {
  test('is empty while the user is active', () => {
    expect(idleSplats(10, 0, 0)).toHaveLength(0);
    expect(idleSplats(10, 3.4, 0)).toHaveLength(0);
  });

  test('drives two virtual pointers once fully idle', () => {
    const splats = idleSplats(10, 30, 0.1);
    expect(splats).toHaveLength(2);
    for (const splat of splats) {
      expect(splat.x).toBeGreaterThan(0);
      expect(splat.x).toBeLessThan(1);
      expect(splat.y).toBeGreaterThan(0);
      expect(splat.y).toBeLessThan(1);
      expect(Number.isFinite(splat.vx)).toBe(true);
      expect(Number.isFinite(splat.vy)).toBe(true);
    }
  });

  test('fades the force in as idle time grows', () => {
    const early = idleSplats(10, 4, 0);
    const late = idleSplats(10, 30, 0);
    const [earlySplat] = early;
    const [lateSplat] = late;
    expect(earlySplat).toBeDefined();
    expect(lateSplat).toBeDefined();
    if (earlySplat === undefined || lateSplat === undefined) return;
    expect(earlySplat.strength).toBeLessThan(lateSplat.strength);
  });
});
