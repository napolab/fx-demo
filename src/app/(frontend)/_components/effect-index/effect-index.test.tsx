import { describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { effects } from '../../content';
import { EffectIndex } from '.';

describe('EffectIndex', () => {
  test('renders a navigable link to each effect with its name as the accessible label', async () => {
    render(<EffectIndex />);
    for (const effect of effects) {
      const link = page.getByRole('link', { name: effect.name, exact: true });
      await expect.element(link).toBeInTheDocument();
      await expect.element(link).toHaveAttribute('href', effect.href);
    }
  });

  test('exposes each effect as a level-3 heading with a captioned thumbnail', async () => {
    render(<EffectIndex />);
    for (const effect of effects) {
      await expect.element(page.getByRole('heading', { level: 3, name: effect.name, exact: true })).toBeInTheDocument();
      await expect.element(page.getByRole('img', { name: effect.thumbAlt, exact: true })).toBeInTheDocument();
    }
  });

  test('groups the list under an accessible section heading', async () => {
    render(<EffectIndex />);
    await expect.element(page.getByRole('heading', { level: 2, name: '作品一覧' })).toBeInTheDocument();
  });
});
