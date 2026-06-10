import { describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { FluidStage } from '.';

describe('FluidStage', () => {
  test('renders the canvas with an accessible description', async () => {
    render(<FluidStage />);
    await expect.element(page.getByRole('img', { name: /流体シミュレーション/ })).toBeInTheDocument();
  });

  test('shows the VJ keyboard hints', async () => {
    render(<FluidStage />);
    await expect.element(page.getByText(/Space: ink \/ 墨 \/ mirror/)).toBeInTheDocument();
  });
});
