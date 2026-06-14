import { css } from 'styled-system/css';

export const srOnly = css({ srOnly: true });

// Skyline image-mosaic in column-width (cw) units. The packing is precomputed for the
// three breakpoint column counts (2 / 3 / 3); media queries pick --cols (and which
// cw-unit set each cell reads), and the container query unit `cqw` turns the units into
// pixels — so the layout is exact, responsive and shift-free with zero measurement. The
// seams come from hairline cell borders (the packing has no gap). The container is itself
// the query container and reserves its height via aspect-ratio (cols : total), since an
// element cannot read its own cqw.
export const root = css({
  listStyle: 'none',
  margin: '0',
  padding: '0',
  position: 'relative',
  containerType: 'inline-size',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'border.default',
  borderRadius: 'none',
  '--cols': '[2]',
  '--total': '[var(--total-2)]',
  '@media (min-width: 768px)': { '--cols': '[3]', '--total': '[var(--total-3)]' },
  '@media (min-width: 1024px)': { '--cols': '[3]', '--total': '[var(--total-4)]' },
  aspectRatio: '[var(--cols) / var(--total)]',
});

// Each cell reads the active breakpoint's cw-unit coordinates and scales them with
// 100cqw / --cols (the column width). box-sizing + hairline border draws the seam.
export const cell = css({
  position: 'absolute',
  overflow: 'hidden',
  boxSizing: 'border-box',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'border.default',
  borderRadius: 'none',
  bg: 'bg.canvas',
  '--col': '[var(--col-2)]',
  '--span': '[var(--span-2)]',
  '--y': '[var(--y-2)]',
  '--h': '[var(--h-2)]',
  '@media (min-width: 768px)': { '--col': '[var(--col-3)]', '--span': '[var(--span-3)]', '--y': '[var(--y-3)]', '--h': '[var(--h-3)]' },
  '@media (min-width: 1024px)': { '--col': '[var(--col-4)]', '--span': '[var(--span-4)]', '--y': '[var(--y-4)]', '--h': '[var(--h-4)]' },
  left: '[calc(var(--col) * 100cqw / var(--cols))]',
  width: '[calc(var(--span) * 100cqw / var(--cols))]',
  top: '[calc(var(--y) * 100cqw / var(--cols))]',
  height: '[calc(var(--h) * 100cqw / var(--cols))]',
  // Hover affordance: an accent border drawn ABOVE the fill image (a plain outline
  // would be painted under the absolutely-positioned img). Keyboard focus is handled
  // by the GLOBAL marching-ants ring on the stretched link's ::after — not here.
  _after: {
    content: '""',
    position: 'absolute',
    inset: '0',
    borderWidth: 'default',
    borderStyle: 'solid',
    borderColor: 'accent.solid',
    opacity: '[0]',
    pointerEvents: 'none',
    zIndex: '[3]',
    transition: 'opacity 0.18s ease',
  },
  '&:hover': {
    zIndex: '[2]',
    _after: { opacity: '[1]' },
  },
});

export const thumb = css({
  display: 'block',
  position: 'absolute',
  inset: '0',
  width: 'full',
  height: 'full',
  objectFit: 'cover',
  bg: 'video.floor',
  // Subtle zoom on hover; the cell's overflow clips it. Motion-safe only.
  _motionSafe: {
    transition: 'transform 0.4s ease',
    'li:hover &': { transform: '[scale(1.04)]' },
  },
});

// Opaque caption bar anchored to the bottom of the cell. Opaque (not translucent over
// the busy thumbnail) so the AA contrast (fg.onSolid on fg.default ≈ 15:1) holds.
// pointer-events none so clicks fall through to the stretched link layer above it.
export const caption = css({
  position: 'absolute',
  left: '0',
  right: '0',
  bottom: '0',
  zIndex: '[1]',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '2',
  bg: 'fg.default',
  color: 'fg.onSolid',
  paddingInline: '3',
  paddingBlock: '2',
});

export const title = css({
  margin: '0',
  display: 'flex',
  alignItems: 'baseline',
  gap: '2',
  minWidth: '0',
  fontFamily: 'display',
  fontSize: 'sm',
  fontWeight: 'semibold',
  letterSpacing: 'wide',
  textTransform: 'uppercase',
  lineHeight: 'tight',
});

export const no = css({
  flexShrink: '0',
  fontFamily: 'mono',
  fontVariantNumeric: 'tabular-nums',
  color: 'fg.onSolid',
  opacity: '[0.7]',
});

// Stretched link: a static (non-positioned) direct child of the absolute cell, so its
// ::before hit-area and the global marching-ants ::after focus ring both anchor to the
// CELL (nearest positioned ancestor) and cover the whole tile — not just the caption.
// The visible name lives in the h3; this link only carries the accessible name (srOnly).
export const link = css({
  display: 'block',
  outline: 'none',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: '0',
    zIndex: '[2]',
  },
  // The global marching-ants focus ring sits 3px OUTSIDE the element; the cell
  // clips overflow (for the hover zoom), so pull the ring 3px INSIDE here to keep
  // it visible. Keeps the global ring's gradient + animation, only nudges inset.
  '&[data-focus-visible]::after': {
    inset: '[3px]',
    zIndex: '[3]',
  },
});

export const open = css({
  flexShrink: '0',
  fontFamily: 'mono',
  fontSize: '2xs',
  letterSpacing: 'wide',
  textTransform: 'uppercase',
  color: 'fg.onSolid',
  opacity: '[0.7]',
});
