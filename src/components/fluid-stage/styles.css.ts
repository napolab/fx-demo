import { css } from 'styled-system/css';

export const root = css({
  position: 'fixed',
  inset: '0',
  bg: 'stage.bg',
  overflow: 'hidden',
});

export const canvas = css({
  display: 'block',
  width: 'full',
  height: 'full',
  touchAction: 'none',
  cursor: 'crosshair',
  '&[data-cursor="hidden"]': { cursor: 'none' },
});

export const notice = css({
  position: 'absolute',
  inset: '0',
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  padding: '8',
  color: 'stage.text',
  fontSize: 'md',
  lineHeight: 'relaxed',
  pointerEvents: 'none',
  '&[data-tone="soft"]': {
    inset: 'auto',
    top: '4',
    left: '4',
    padding: '0',
    color: 'stage.dim',
    fontSize: 'sm',
    textAlign: 'left',
    transition: 'opacity 1.2s ease',
    '&[data-visible="false"]': { opacity: '0' },
  },
});

export const hint = css({
  position: 'absolute',
  bottom: '5',
  left: '50%',
  transform: 'translateX(-50%)',
  color: 'stage.dim',
  fontSize: 'sm',
  letterSpacing: 'wide',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  transition: 'opacity 1.2s ease',
  '&[data-visible="false"]': { opacity: '0' },
});
