import { describe, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { DEFAULT_PARAMS } from '../types';
import { GlitchControls } from '.';

const noopProps = () => ({
  params: DEFAULT_PARAMS,
  onChangeField: vi.fn(),
  onChangeBlockSize: vi.fn(),
  onRandomizeSeed: vi.fn(),
});

describe('GlitchControls', () => {
  test('exposes every parameter as an accessible control', async () => {
    render(<GlitchControls {...noopProps()} />);
    for (const name of ['Amount', 'Quality', 'Table Chaos', 'Chroma', 'Shift', 'Seed']) {
      await expect.element(page.getByRole('slider', { name })).toBeInTheDocument();
    }
    await expect.element(page.getByRole('radiogroup', { name: 'Block Size' })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'シードをランダム化' })).toBeInTheDocument();
  });

  test('block size selection reports the numeric value', async () => {
    const props = noopProps();
    render(<GlitchControls {...props} />);
    await page.getByText('32', { exact: true }).click();
    expect(props.onChangeBlockSize).toHaveBeenCalledWith(32);
  });

  test('randomize button fires', async () => {
    const props = noopProps();
    render(<GlitchControls {...props} />);
    await page.getByRole('button', { name: 'シードをランダム化' }).click();
    expect(props.onRandomizeSeed).toHaveBeenCalled();
  });
});
