import { describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { TraceStage } from '.';

describe('TraceStage', () => {
  test('renders the stage canvas with an accessible description', async () => {
    render(<TraceStage />);
    await expect.element(page.getByRole('img', { name: /輪郭トレース/ })).toBeInTheDocument();
  });

  test('shows the interaction hint', async () => {
    render(<TraceStage />);
    await expect.element(page.getByText(/F: フルスクリーン/)).toBeInTheDocument();
  });

  test('offers a video file source button', async () => {
    render(<TraceStage />);
    await expect.element(page.getByRole('button', { name: /動画を読み込む/ })).toBeInTheDocument();
  });
});
