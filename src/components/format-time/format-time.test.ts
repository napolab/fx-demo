import { describe, expect, it } from 'vitest';

import { formatTime } from './index';

describe('formatTime', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatTime(83)).toBe('1:23');
  });

  it('zero-pads single-digit seconds', () => {
    expect(formatTime(5)).toBe('0:05');
  });

  it('renders zero', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('floors fractional seconds', () => {
    expect(formatTime(9.9)).toBe('0:09');
  });

  it('clamps negative and non-finite input to zero', () => {
    expect(formatTime(-5)).toBe('0:00');
    expect(formatTime(Number.NaN)).toBe('0:00');
  });
});
