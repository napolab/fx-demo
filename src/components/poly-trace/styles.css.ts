import { css } from 'styled-system/css';

export const root = css({
  position: 'fixed',
  inset: '0',
  bg: 'video.floor',
  overflow: 'hidden',
});

// p5 injects its <canvas> here and sizes it itself (createCanvas / resizeCanvas
// track this host), so no child selector is needed.
export const stage = css({
  position: 'absolute',
  inset: '0',
});

export const notice = css({
  position: 'absolute',
  inset: '0',
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  padding: '8',
  color: 'fg.default',
  fontSize: 'md',
  lineHeight: 'relaxed',
  pointerEvents: 'none',
});
