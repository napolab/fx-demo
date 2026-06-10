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
        },
      },
    },
  },
  outdir: 'styled-system',
});
