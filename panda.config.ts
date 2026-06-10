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
        },
      },
    },
  },
  outdir: 'styled-system',
});
