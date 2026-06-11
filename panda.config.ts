import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  preflight: true,
  include: ['./src/**/*.{ts,tsx,js,jsx}'],
  exclude: [],
  jsxFramework: 'react',
  theme: {
    extend: {
      tokens: {
        colors: {
          stage: {
            // Near-black stage floor; white text on it clears WCAG 2.1 AA easily.
            bg: { value: '#04060a' },
            text: { value: '#edf2f7' },
            dim: { value: 'rgba(237, 242, 247, 0.62)' },
          },
          trace: {
            // Monochrome stage: neutral near-black ground, white line work;
            // hierarchy comes from brightness, not hue.
            // hudText on bg ≈ 13:1, text on bg ≈ 16:1 — clears WCAG 2.1 AA;
            // hud (non-text bbox stroke) ≈ 5.8:1 clears the 3:1 non-text bar.
            bg: { value: '#0a0a0a' },
            line: { value: '#f2f2f2' },
            hud: { value: '#8c8c8c' },
            hudText: { value: '#d4d4d4' },
            wire: { value: '#bfbfbf' },
            text: { value: '#ededed' },
            dim: { value: 'rgba(237, 237, 237, 0.62)' },
          },
        },
      },
    },
  },
  outdir: 'styled-system',
});
