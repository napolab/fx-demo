import { describe, expect, test } from 'vitest';

import { formatBlobLabel, formatStatsLine } from '.';

describe('formatBlobLabel', () => {
  test('formats id, centroid and area in fixed widths', () => {
    const blob = { id: 3, minX: 0.1, minY: 0.1, maxX: 0.5, maxY: 0.9, cx: 0.4214, cy: 0.1832, area: 0.0315 };
    expect(formatBlobLabel(blob)).toBe('blob_03 x:0.421 y:0.183 a:0.032');
  });

  test('pads double-digit ids without truncation', () => {
    const blob = { id: 12, minX: 0, minY: 0, maxX: 1, maxY: 1, cx: 0.5, cy: 0.5, area: 1 };
    expect(formatBlobLabel(blob)).toBe('blob_12 x:0.500 y:0.500 a:1.000');
  });
});

describe('formatStatsLine', () => {
  test('summarizes blob and vertex counts', () => {
    expect(formatStatsLine(2, 148)).toBe('tracking: 2 blobs / 148 verts');
  });
});
