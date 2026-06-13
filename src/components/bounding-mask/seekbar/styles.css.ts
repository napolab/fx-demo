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
  bg: 'bg.canvas',
  color: 'fg.default',
  borderWidth: 'default',
  borderStyle: 'solid',
  borderColor: 'border.strong',
  borderRadius: 'none',
  backdropFilter: 'blur(8px)',
});

export const playButton = css({
  flexShrink: '0',
  display: 'grid',
  placeItems: 'center',
  width: '8',
  height: '8',
  color: 'fg.default',
  bg: 'transparent',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'border.default',
  borderRadius: 'none',
  fontFamily: 'mono',
  fontSize: 'sm',
  cursor: 'pointer',
  '&[data-hovered]': { color: 'fg.onSolid', bg: 'accent.solid', borderColor: 'accent.solid' },
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
    bg: 'border.default',
    borderRadius: 'none',
  },
});

export const thumb = css({
  top: '50%',
  width: '4',
  height: '4',
  borderRadius: 'none',
  bg: 'accent.solid',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'fg.onSolid',
  '&[data-dragging]': { transform: 'scale(1.15)' },
});

export const time = css({
  flexShrink: '0',
  fontFamily: 'mono',
  fontSize: 'sm',
  color: 'fg.muted',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});
