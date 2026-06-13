import { css } from 'styled-system/css';

export const root = css({
  position: 'absolute',
  right: '4',
  bottom: '4',
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
  width: '72',
  maxWidth: 'calc(100vw - {spacing.8})',
  padding: '4',
  bg: 'bg.canvas',
  color: 'fg.default',
  borderWidth: 'default',
  borderStyle: 'solid',
  borderColor: 'border.strong',
  borderRadius: 'none',
  backdropFilter: 'blur(8px)',
});

export const heading = css({
  fontSize: 'xs',
  letterSpacing: 'widest',
  textTransform: 'uppercase',
  fontFamily: 'display',
  color: 'fg.muted',
});

export const slider = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
});

export const sliderHeader = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
});

export const sliderLabel = css({
  fontSize: 'sm',
  fontFamily: 'mono',
});

export const sliderOutput = css({
  fontSize: 'xs',
  color: 'fg.muted',
  fontFamily: 'mono',
  fontVariantNumeric: 'tabular-nums',
});

export const sliderTrack = css({
  position: 'relative',
  height: '5',
  width: 'full',
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

export const sliderThumb = css({
  top: '50%',
  width: '4',
  height: '4',
  borderRadius: 'none',
  bg: 'accent.solid',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'border.default',
  '&[data-dragging]': { transform: 'scale(1.15)' },
});

export const switchRow = css({
  display: 'flex',
  gap: '4',
  flexWrap: 'wrap',
});

export const switchRoot = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  fontSize: 'sm',
  fontFamily: 'mono',
  cursor: 'pointer',
});

export const switchIndicator = css({
  display: 'inline-block',
  width: '8',
  height: '5',
  borderRadius: 'none',
  bg: 'border.default',
  position: 'relative',
  transition: 'background 0.2s ease',
  _before: {
    content: '""',
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '4',
    height: '4',
    borderRadius: 'none',
    bg: 'fg.default',
    transition: 'transform 0.2s ease',
  },
  '[data-selected] &': {
    bg: 'accent.solid',
    _before: { transform: 'translateX(12px)', bg: 'fg.onSolid' },
  },
});
