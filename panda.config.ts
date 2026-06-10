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
            // CV-green stage: near-black ground, lime trace lines, cyan HUD.
            // hudText on bg is ~12:1, text on bg ~15:1 — clears WCAG 2.1 AA.
            bg: { value: '#0b0e0b' },
            line: { value: '#7cfc00' },
            hud: { value: '#39c5cf' },
            hudText: { value: '#9fe8ee' },
            wire: { value: '#cfe8cf' },
            text: { value: '#edf2f7' },
            dim: { value: 'rgba(207, 232, 207, 0.62)' },
          },
        },
      },
    },
  },
  outdir: 'styled-system',
});
