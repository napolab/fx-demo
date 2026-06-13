import { css } from 'styled-system/css';

export const root = css({
  position: 'fixed',
  inset: '0',
  bg: 'video.floor',
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
  color: 'fg.onSolid',
  fontFamily: 'mono',
  fontSize: 'md',
  lineHeight: 'body',
  pointerEvents: 'none',
  // Top-left soft notice becomes a brutalist white chip ("paper on screen").
  '&[data-tone="soft"]': {
    inset: 'auto',
    top: '4',
    left: '4',
    display: 'inline-block',
    paddingInline: '3',
    paddingBlock: '2',
    bg: 'bg.canvas',
    color: 'fg.default',
    borderWidth: 'default',
    borderStyle: 'solid',
    borderColor: 'border.strong',
    borderRadius: 'none',
    fontSize: 'xs',
    letterSpacing: 'wide',
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
  paddingInline: '3',
  paddingBlock: '2',
  bg: 'bg.canvas',
  color: 'fg.default',
  borderWidth: 'default',
  borderStyle: 'solid',
  borderColor: 'border.strong',
  borderRadius: 'none',
  fontFamily: 'mono',
  fontSize: 'xs',
  letterSpacing: 'wide',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  transition: 'opacity 1.2s ease',
  '&[data-visible="false"]': { opacity: '0' },
});
