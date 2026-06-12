import { css } from 'styled-system/css';

export const root = css({
  position: 'fixed',
  inset: '0',
  bg: 'mask.bg',
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
  color: 'mask.dim',
  fontSize: 'sm',
  textAlign: 'left',
});

export const controlButton = css({
  padding: '2',
  paddingInline: '4',
  color: 'mask.text',
  bg: 'transparent',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'mask.accent',
  borderRadius: 'sm',
  fontSize: 'sm',
  cursor: 'pointer',
  '&[data-hovered]': { color: 'mask.bg', bg: 'mask.accent' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'mask.line', outlineOffset: '2px' },
});

export const hint = css({
  position: 'absolute',
  bottom: '5',
  left: '50%',
  transform: 'translateX(-50%)',
  color: 'mask.dim',
  fontSize: 'sm',
  letterSpacing: 'wide',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  transition: 'opacity 1.2s ease',
  '&[data-visible="false"]': { opacity: '0' },
});
