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
            // Control-panel chrome: translucent panel over the stage, hairlines and
            // an accent that clears the 3:1 non-text contrast ratio on the panel.
            panel: { value: 'rgba(8, 12, 18, 0.82)' },
            line: { value: 'rgba(237, 242, 247, 0.28)' },
            accent: { value: '#7cd9ff' },
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
            marker: { value: '#b3423b' },
            wire: { value: '#bfbfbf' },
            text: { value: '#ededed' },
            dim: { value: 'rgba(237, 237, 237, 0.62)' },
          },
          mask: {
            // Near-black stage for the bounding-mask page; the user-chosen fill
            // colour is painted on the canvas (outside the token system). UI
            // chrome reuses the stage palette so text/contrast stay WCAG 2.1 AA:
            // text on bg ≈ 16:1, accent clears the 3:1 non-text ratio on panel.
            bg: { value: '#04060a' },
            text: { value: '#edf2f7' },
            dim: { value: 'rgba(237, 242, 247, 0.62)' },
            panel: { value: 'rgba(8, 12, 18, 0.82)' },
            line: { value: 'rgba(237, 242, 247, 0.28)' },
            accent: { value: '#7cd9ff' },
            // Recording indicator (decorative dot + active REC button); reads
            // clearly on the dark panel.
            rec: { value: '#ff5a5a' },
          },
        },
      },
    },
  },
  outdir: 'styled-system',
});
