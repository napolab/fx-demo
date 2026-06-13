import { css } from 'styled-system/css';

export const root = css({
  position: 'absolute',
  right: '4',
  top: '4',
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
  width: '72',
  maxWidth: 'calc(100vw - {spacing.8})',
  maxHeight: 'calc(100dvh - {spacing.8})',
  overflowY: 'auto',
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
  fontFamily: 'display',
  fontSize: 'xs',
  letterSpacing: 'widest',
  textTransform: 'uppercase',
  color: 'fg.muted',
});

export const group = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2',
});

export const groupLabel = css({
  fontFamily: 'mono',
  fontSize: 'sm',
  color: 'fg.muted',
});

export const toggleGroup = css({
  display: 'grid',
  gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]',
  gap: '2',
});

export const toggleButton = css({
  padding: '2',
  color: 'fg.default',
  bg: 'transparent',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'border.default',
  borderRadius: 'none',
  fontFamily: 'mono',
  fontSize: 'sm',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  '&[data-hovered]': { borderColor: 'accent.solid' },
  '&[data-selected]': { color: 'fg.onSolid', bg: 'accent.solid', borderColor: 'accent.solid' },
});

export const partGrid = css({
  display: 'grid',
  gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]',
  gap: '2',
});

export const switchRoot = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  fontFamily: 'mono',
  fontSize: 'sm',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
});

export const switchIndicator = css({
  display: 'inline-block',
  flexShrink: '0',
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
  fontFamily: 'mono',
  fontSize: 'sm',
});

export const sliderOutput = css({
  fontFamily: 'mono',
  fontSize: 'xs',
  color: 'fg.muted',
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
  borderColor: 'fg.onSolid',
  '&[data-dragging]': { transform: 'scale(1.15)' },
});

export const swatchPicker = css({
  display: 'flex',
  gap: '2',
  flexWrap: 'wrap',
});

export const swatchItem = css({
  width: '7',
  height: '7',
  borderRadius: 'none',
  cursor: 'pointer',
  '&[data-selected]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'accent.solid', outlineOffset: '2px' },
});

export const swatch = css({
  width: 'full',
  height: 'full',
  borderRadius: 'none',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'border.default',
});

export const customButton = css({
  alignSelf: 'start',
  padding: '1',
  paddingInline: '3',
  color: 'fg.default',
  bg: 'transparent',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'border.default',
  borderRadius: 'none',
  fontFamily: 'mono',
  fontSize: 'sm',
  cursor: 'pointer',
  '&[data-hovered]': { borderColor: 'accent.solid' },
});

export const popover = css({
  bg: 'bg.canvas',
  borderWidth: 'default',
  borderStyle: 'solid',
  borderColor: 'border.strong',
  borderRadius: 'none',
  backdropFilter: 'blur(8px)',
});

export const dialog = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '3',
  padding: '4',
  outline: 'none',
});

export const colorArea = css({
  width: '[180px]',
  height: '[180px]',
  borderRadius: 'none',
});

export const colorThumb = css({
  width: '[16px]',
  height: '[16px]',
  borderRadius: 'none',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderColor: 'fg.default',
  boxShadow: '[0 0 0 1px rgba(0,0,0,0.4)]',
});

export const hueSlider = css({
  width: '[180px]',
});

export const hueTrack = css({
  height: '6',
  borderRadius: 'none',
});

export const sourceRow = css({
  display: 'flex',
  gap: '2',
  flexWrap: 'wrap',
  marginTop: '1',
});

export const controlButton = css({
  padding: '2',
  paddingInline: '3',
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

export const recordButton = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2',
  marginTop: '1',
  padding: '2',
  paddingInline: '3',
  color: 'fg.default',
  bg: 'transparent',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'border.default',
  borderRadius: 'none',
  fontFamily: 'mono',
  fontSize: 'sm',
  fontVariantNumeric: 'tabular-nums',
  cursor: 'pointer',
  '&[data-hovered]': { borderColor: 'mask.rec' },
  '&[data-recording]': { color: 'mask.rec', borderColor: 'mask.rec' },
});

export const recordDot = css({
  flexShrink: '0',
  width: '3',
  height: '3',
  borderRadius: 'none',
  bg: 'border.default',
  '[data-recording] &': { bg: 'mask.rec' },
});
