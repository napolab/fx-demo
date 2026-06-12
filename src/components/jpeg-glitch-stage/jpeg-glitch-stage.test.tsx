import { describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { JPEGGlitchStage } from '.';

describe('JPEGGlitchStage', () => {
  test('renders the glitch canvas with an accessible description', async () => {
    render(<JPEGGlitchStage />);
    await expect.element(page.getByRole('img', { name: /JPEG グリッチ/ })).toBeInTheDocument();
  });

  test('renders the effect controls panel', async () => {
    render(<JPEGGlitchStage />);
    await expect.element(page.getByRole('slider', { name: 'Compression' })).toBeInTheDocument();
  });
});
