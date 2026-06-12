import { describe, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { DEFAULT_PARAMS } from '../types';
import { GlitchControls } from '.';

const noopProps = () => ({
  params: DEFAULT_PARAMS,
  onChangeField: vi.fn(),
  onToggleField: vi.fn(),
  onChangeBlockSize: vi.fn(),
});

describe('GlitchControls', () => {
  test('exposes every plugin parameter as an accessible control', async () => {
    render(<GlitchControls {...noopProps()} />);
    const sliders = [
      'Compression Ratio',
      'Broken Bytes',
      'Start of Glitch',
      'End of Glitch',
      'Broken Bytes Seed',
      'QTC Position',
      'QTC Value',
      'QTC Breaking Bytes',
      'QTC Max Random Value',
      'QTC Seed',
      'QTL Position',
      'QTL Value',
      'QTL Breaking Bytes',
      'QTL Max Random Value',
      'QTL Seed',
      'Chroma',
    ];
    for (const name of sliders) {
      await expect.element(page.getByRole('slider', { name, exact: true })).toBeInTheDocument();
    }
    for (const name of ['QTC', 'QTL', 'Inverse DCT', 'YCbCr To RGB']) {
      await expect.element(page.getByRole('checkbox', { name, exact: true })).toBeInTheDocument();
    }
    await expect.element(page.getByRole('radiogroup', { name: 'Block Size' })).toBeInTheDocument();
  });

  test('block size selection reports the numeric value', async () => {
    const props = noopProps();
    render(<GlitchControls {...props} />);
    await page.getByText('32', { exact: true }).click();
    expect(props.onChangeBlockSize).toHaveBeenCalledWith(32);
  });

  test('advanced toggles report boolean changes', async () => {
    const props = noopProps();
    render(<GlitchControls {...props} />);
    await page.getByText('Inverse DCT', { exact: true }).click();
    expect(props.onToggleField).toHaveBeenCalledWith('inverseDCT', false);
  });
});
