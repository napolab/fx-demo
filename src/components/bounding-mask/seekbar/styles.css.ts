import { css } from 'styled-system/css';

export const root = css({
  position: 'absolute',
  left: '4',
  right: '4',
  bottom: '4',
  display: 'flex',
  alignItems: 'center',
  gap: '3',
  padding: '3',
  paddingInline: '4',
  bg: 'mask.panel',
  color: 'mask.text',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'mask.line',
  borderRadius: 'lg',
  backdropFilter: 'blur(8px)',
});

export const playButton = css({
  flexShrink: '0',
  display: 'grid',
  placeItems: 'center',
  width: '8',
  height: '8',
  color: 'mask.text',
  bg: 'transparent',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'mask.line',
  borderRadius: 'full',
  fontSize: 'sm',
  cursor: 'pointer',
  '&[data-hovered]': { color: 'mask.bg', bg: 'mask.accent', borderColor: 'mask.accent' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'mask.accent', outlineOffset: '2px' },
});

export const slider = css({
  flex: '1',
  display: 'flex',
  alignItems: 'center',
  minWidth: '0',
});

export const track = css({
  position: 'relative',
  width: 'full',
  height: '5',
  cursor: 'pointer',
  _before: {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '0',
    right: '0',
    height: '2px',
    transform: 'translateY(-50%)',
    bg: 'mask.line',
    borderRadius: 'full',
  },
});

export const thumb = css({
  top: '50%',
  width: '4',
  height: '4',
  borderRadius: 'full',
  bg: 'mask.accent',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'mask.bg',
  '&[data-dragging]': { transform: 'scale(1.15)' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'mask.accent', outlineOffset: '2px' },
});

export const time = css({
  flexShrink: '0',
  fontSize: 'sm',
  color: 'mask.dim',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});
