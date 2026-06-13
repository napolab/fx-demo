import { defineConfig } from '@pandacss/dev';

import { semanticTokens, tokens } from './src/themes/tokens';

// The ring itself attaches to ANY focused element (react-aria exposes focus via
// `[data-focus-visible]`; native controls via `:focus-visible`). Only the
// containing-block `position: relative` is restricted to statically-positioned
// interactive tags — applying it to an absolutely-positioned slider thumb would
// move it. The stretched index link is also excluded so its ring (and ::before
// hit-area) anchor to the card, not the link.
const focusState = ':is(:focus-visible, [data-focus-visible])';
const positionedHosts = 'a:not([data-stretched]), button, label, [role="radio"], [role="switch"], [role="checkbox"]';

// Four blue dashed edges drawn as ::after background gradients; the marchingAnts
// keyframe slides their background-position so the dashes "march". Ported from
// www.napochaan.com — the signature focus affordance.
const marchingRing = {
  content: '""',
  position: 'absolute',
  inset: '-3px',
  pointerEvents: 'none',
  backgroundImage:
    'repeating-linear-gradient(90deg, var(--colors-blue-9) 0 4px, transparent 4px 8px), repeating-linear-gradient(90deg, var(--colors-blue-9) 0 4px, transparent 4px 8px), repeating-linear-gradient(0deg, var(--colors-blue-9) 0 4px, transparent 4px 8px), repeating-linear-gradient(0deg, var(--colors-blue-9) 0 4px, transparent 4px 8px)',
  backgroundSize: '8px 2px, 8px 2px, 2px 8px, 2px 8px',
  backgroundPosition: '0 0, 0 100%, 0 0, 100% 0',
  backgroundRepeat: 'repeat-x, repeat-x, repeat-y, repeat-y',
};

export default defineConfig({
  preflight: true,
  include: ['./src/**/*.{ts,tsx,js,jsx}'],
  exclude: [],
  jsxFramework: 'react',
  globalCss: {
    'html, body': {
      fontFamily: 'body',
      color: 'fg.default',
      backgroundColor: 'bg.canvas',
    },
    // --- Marching-ants focus ring (ported from www.napochaan.com) ------------
    [focusState]: { outlineStyle: 'none' },
    // Give static interactive elements a containing block so the ring hugs them.
    // The stretched index link stays static so its ring frames the whole card.
    [`:is(${positionedHosts})${focusState}`]: { position: 'relative' },
    [`${focusState}::after`]: marchingRing,
    // Dashes only march when motion is allowed; otherwise they hold as a static
    // dashed ring — the reduced-motion fallback.
    '@media (prefers-reduced-motion: no-preference)': {
      [`${focusState}::after`]: { animation: 'marchingAnts 0.6s linear infinite' },
    },
  },
  theme: {
    extend: {
      tokens,
      semanticTokens,
      keyframes: {
        marchingAnts: {
          to: { backgroundPosition: '8px 0, -8px 100%, 0 -8px, 100% 8px' },
        },
      },
    },
  },
  outdir: 'styled-system',
});
