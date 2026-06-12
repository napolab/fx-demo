import { describe, expect, test } from 'vitest';

import { formatPartLabel, formatStatsLine } from '.';

describe('formatPartLabel', () => {
  test('formats the part name and box center in fixed widths', () => {
    const box = { part: 'face' as const, minX: 0.4, minY: 0.1, maxX: 0.6, maxY: 0.3, cx: 0.5123, cy: 0.2046 };
    expect(formatPartLabel(box)).toBe('face x:0.512 y:0.205');
  });

  test('keeps the left/right suffix verbatim', () => {
    const box = { part: 'hand_L' as const, minX: 0, minY: 0, maxX: 1, maxY: 1, cx: 0.5, cy: 0.5 };
    expect(formatPartLabel(box)).toBe('hand_L x:0.500 y:0.500');
  });
});

describe('formatStatsLine', () => {
  test('summarizes part and vertex counts', () => {
    expect(formatStatsLine(8, 148)).toBe('tracking: 8 parts / 148 verts');
  });
});
