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
            // Near-black stage, monochrome trace/wire line work; the tracking
            // HUD (bbox + label plate) is the single blue accent.
            // labelText on labelBg ≈ 18:1, text on bg ≈ 16:1 — WCAG 2.1 AA.
            // hud is decorative stage graphics (bbox strokes), not UI text.
            bg: { value: '#0a0a0a' },
            line: { value: '#f2f2f2' },
            hud: { value: 'oklch(0.490 0.287 266)' },
            labelBg: { value: 'oklch(0.185 0.020 265)' },
            labelText: { value: '#ffffff' },
            marker: { value: '#ff2a2a' },
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
