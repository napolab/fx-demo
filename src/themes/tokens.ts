import { defineSemanticTokens, defineTokens } from '@pandacss/dev';

// ---------------------------------------------------------------------------
// Primitive Tokens — ported from www.napochaan.com so the camera-FX showcase
// shares its light-brutalist palette. OKLCH scales (gray / blue / red) plus the
// dark `video.floor` that the FX canvases keep using (webcam legibility needs a
// near-black floor), and the canvas-drawn FX colours (trace wireframe / HUD,
// mask recording dot) which are part of the rendered image, not the chrome.
// ---------------------------------------------------------------------------
export const tokens = defineTokens({
  colors: {
    white: { value: 'oklch(1.000 0 0)' },
    black: { value: 'oklch(0.000 0 0)' },

    gray: {
      1: { value: 'oklch(0.952 0.004 265)' },
      2: { value: 'oklch(0.934 0.005 265)' },
      3: { value: 'oklch(0.918 0.005 265)' },
      4: { value: 'oklch(0.900 0.006 265)' },
      5: { value: 'oklch(0.884 0.007 265)' },
      6: { value: 'oklch(0.845 0.008 265)' },
      7: { value: 'oklch(0.785 0.010 265)' },
      8: { value: 'oklch(0.700 0.013 265)' },
      9: { value: 'oklch(0.560 0.016 265)' },
      10: { value: 'oklch(0.510 0.017 265)' },
      11: { value: 'oklch(0.430 0.018 265)' },
      12: { value: 'oklch(0.185 0.020 265)' },
    },
    blue: {
      1: { value: 'oklch(0.972 0.012 266)' },
      2: { value: 'oklch(0.955 0.024 266)' },
      3: { value: 'oklch(0.925 0.046 266)' },
      4: { value: 'oklch(0.892 0.070 266)' },
      5: { value: 'oklch(0.850 0.100 266)' },
      6: { value: 'oklch(0.788 0.142 266)' },
      7: { value: 'oklch(0.700 0.192 266)' },
      8: { value: 'oklch(0.600 0.245 266)' },
      9: { value: 'oklch(0.490 0.287 266)' },
      10: { value: 'oklch(0.450 0.270 266)' },
      11: { value: 'oklch(0.520 0.225 266)' },
      12: { value: 'oklch(0.330 0.150 266)' },
    },
    red: {
      1: { value: 'oklch(0.972 0.013 25)' },
      2: { value: 'oklch(0.957 0.024 25)' },
      3: { value: 'oklch(0.930 0.044 25)' },
      4: { value: 'oklch(0.898 0.066 25)' },
      5: { value: 'oklch(0.858 0.098 25)' },
      6: { value: 'oklch(0.800 0.140 25)' },
      7: { value: 'oklch(0.728 0.182 25)' },
      8: { value: 'oklch(0.672 0.225 25)' },
      9: { value: 'oklch(0.630 0.256 25)' },
      10: { value: 'oklch(0.585 0.250 25)' },
      11: { value: 'oklch(0.530 0.205 25)' },
      12: { value: 'oklch(0.350 0.130 25)' },
    },

    // Inherent-dark surfaces: the webcam/FX canvas floor. Light chrome panels
    // sit on top of this; it never carries body text directly.
    video: {
      floor: { value: '#04060a' },
    },

    // ---- FX-intrinsic dark surfaces (NOT the light chrome) -----------------
    // The Trace FX is a monochrome wireframe + blue tracking-HUD rendered over a
    // black floor — both the canvas drawing and its DOM HUD overlay are part of
    // that rendered look, so they keep this dark/monochrome palette rather than
    // the light control-panel chrome. `wire`/`marker`/`hud`/`labelBg`/`labelText`
    // are drawn into the canvas by the sketch.
    trace: {
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

    // The Bounding-mask render draws a small recording HUD into the canvas
    // overlay (render/index.ts) — these stay dark because they sit on the video.
    mask: {
      bg: { value: '#04060a' },
      panel: { value: 'rgba(8, 12, 18, 0.82)' },
      text: { value: '#edf2f7' },
      rec: { value: '#ff5a5a' },
    },
  },

  fontSizes: {
    '2xs': { value: '0.6875rem' }, // 11
    xs: { value: '0.75rem' }, // 12 caption/mono
    sm: { value: '0.875rem' }, // 14
    md: { value: '1rem' }, // 16 body
    lg: { value: '1.1875rem' }, // 19
    xl: { value: '1.4375rem' }, // 23 (= h3)
    h3: { value: '1.4375rem' }, // 23
    h2: { value: 'clamp(1.75rem, 3.5vw, 2.0625rem)' }, // 28→33
    h1: { value: 'clamp(2.0625rem, 5vw, 3.1875rem)' }, // 33→51
    display: { value: 'clamp(3.5rem, 9vw, 6rem)' }, // 56→96
    hero: { value: 'clamp(3.5rem, 15vw, 10rem)' }, // 56→160
  },

  lineHeights: {
    none: { value: '0.9' },
    tight: { value: '1.2' },
    snug: { value: '1.4' },
    body: { value: '1.7' },
    jp: { value: '1.9' },
  },

  fontWeights: {
    normal: { value: '400' },
    medium: { value: '500' },
    semibold: { value: '600' },
    bold: { value: '700' },
  },

  letterSpacings: {
    tighter: { value: '-0.04em' },
    tight: { value: '-0.02em' },
    normal: { value: '0' },
    wide: { value: '0.04em' },
    wider: { value: '0.12em' },
    widest: { value: '0.2em' },
  },

  radii: {
    none: { value: '0' },
    pill: { value: '9999px' },
  },

  borderWidths: {
    none: { value: '0' },
    hairline: { value: '1px' },
    default: { value: '2px' },
    strong: { value: '3px' },
  },

  fonts: {
    // Adobe Fonts (Typekit kit vmz7pfu) display + mono; M PLUS 1 (Google) body.
    display: { value: '"digibop", system-ui, sans-serif' },
    body: { value: 'var(--font-mplus1-en), var(--font-mplus1), system-ui, -apple-system, sans-serif' },
    mono: { value: '"config-mono-vf", ui-monospace, "Cascadia Code", monospace' },
  },

  durations: {
    instant: { value: '0ms' },
    fast: { value: '90ms' },
    base: { value: '150ms' },
    snap: { value: '180ms' },
    slow: { value: '280ms' },
  },

  easings: {
    linear: { value: 'linear' },
    step1: { value: 'steps(1)' },
    stepSnap: { value: 'steps(3, end)' },
  },
});

// ---------------------------------------------------------------------------
// Semantic Tokens — light-first (brutalist). Mirrors www.napochaan.com so the
// chrome (index hub + every FX control panel) reads near-black on near-white
// with one electric-blue accent. WCAG 2.1 AA is inherited from those mappings:
// fg.default on bg.canvas ≈ 15:1, accent.solid on bg.canvas ≈ 5.5:1.
// ---------------------------------------------------------------------------
export const semanticTokens = defineSemanticTokens({
  colors: {
    bg: {
      canvas: { value: '{colors.gray.1}' },
      subtle: { value: '{colors.gray.2}' },
      muted: { value: '{colors.gray.3}' },
      emphasis: { value: '{colors.gray.5}' },
    },
    fg: {
      default: { value: '{colors.gray.12}' },
      muted: { value: '{colors.gray.11}' },
      subtle: { value: '{colors.gray.9}' },
      onSolid: { value: '{colors.gray.1}' },
      onDanger: { value: '{colors.gray.1}' },
    },
    border: {
      subtle: { value: '{colors.gray.6}' },
      default: { value: '{colors.gray.7}' },
      strong: { value: '{colors.gray.8}' },
      focus: { value: '{colors.blue.7}' },
    },
    accent: {
      solid: { value: '{colors.blue.9}' },
      solidHover: { value: '{colors.blue.10}' },
      text: { value: '{colors.blue.9}' },
      border: { value: '{colors.blue.7}' },
    },
    danger: {
      solid: { value: '{colors.red.11}' },
      solidHover: { value: '{colors.red.12}' },
      text: { value: '{colors.red.11}' },
      border: { value: '{colors.red.7}' },
      spot: { value: '{colors.red.9}' },
    },
  },
});
