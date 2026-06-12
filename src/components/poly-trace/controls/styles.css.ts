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
  bg: 'stage.panel',
  color: 'stage.text',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'stage.line',
  borderRadius: 'lg',
  backdropFilter: 'blur(8px)',
});

export const heading = css({
  fontSize: 'xs',
  letterSpacing: 'widest',
  textTransform: 'uppercase',
  color: 'stage.dim',
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
});

export const sliderOutput = css({
  fontSize: 'xs',
  color: 'stage.dim',
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
    bg: 'stage.line',
    borderRadius: 'full',
  },
});

export const sliderThumb = css({
  top: '50%',
  width: '4',
  height: '4',
  borderRadius: 'full',
  bg: 'stage.accent',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'stage.bg',
  '&[data-dragging]': { transform: 'scale(1.15)' },
  '&[data-focus-visible]': {
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: 'stage.accent',
    outlineOffset: '2px',
  },
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
  cursor: 'pointer',
});

export const switchIndicator = css({
  display: 'inline-block',
  width: '8',
  height: '5',
  borderRadius: 'full',
  bg: 'stage.line',
  position: 'relative',
  transition: 'background 0.2s ease',
  _before: {
    content: '""',
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '4',
    height: '4',
    borderRadius: 'full',
    bg: 'stage.text',
    transition: 'transform 0.2s ease',
  },
  '[data-selected] &': {
    bg: 'stage.accent',
    _before: { transform: 'translateX(12px)', bg: 'stage.bg' },
  },
  '[data-focus-visible] &': {
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: 'stage.accent',
    outlineOffset: '2px',
  },
});
