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
});

export const cameraPrompt = css({
  position: 'absolute',
  top: '4',
  left: '4',
  display: 'grid',
  gap: '2',
  justifyItems: 'start',
  color: 'fg.muted',
  fontSize: 'sm',
  textAlign: 'left',
});

export const controlButton = css({
  padding: '2',
  paddingInline: '4',
  color: 'fg.default',
  bg: 'transparent',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'accent.solid',
  borderRadius: 'none',
  fontFamily: 'mono',
  fontSize: 'sm',
  cursor: 'pointer',
  '&[data-hovered]': { color: 'fg.onSolid', bg: 'accent.solid' },
});

export const hint = css({
  position: 'absolute',
  bottom: '5',
  left: '50%',
  transform: 'translateX(-50%)',
  color: 'fg.subtle',
  fontSize: 'sm',
  letterSpacing: 'wide',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  transition: 'opacity 1.2s ease',
  '&[data-visible="false"]': { opacity: '0' },
});
