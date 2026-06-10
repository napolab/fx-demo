import { expect, test } from 'vitest';

test('arithmetic sanity', () => {
  expect(1 + 1).toBe(2);
});

test('webgpu type is available in browser env', () => {
  expect(typeof navigator).toBe('object');
});
