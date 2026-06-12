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
  bg: 'mask.panel',
  color: 'mask.text',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'mask.line',
  borderRadius: 'lg',
  backdropFilter: 'blur(8px)',
});

export const heading = css({
  fontSize: 'xs',
  letterSpacing: 'widest',
  textTransform: 'uppercase',
  color: 'mask.dim',
});

export const group = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '2',
});

export const groupLabel = css({
  fontSize: 'sm',
  color: 'mask.dim',
});

export const toggleGroup = css({
  display: 'grid',
  gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]',
  gap: '2',
});

export const toggleButton = css({
  padding: '2',
  color: 'mask.text',
  bg: 'transparent',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'mask.line',
  borderRadius: 'sm',
  fontSize: 'sm',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  '&[data-hovered]': { borderColor: 'mask.accent' },
  '&[data-selected]': { color: 'mask.bg', bg: 'mask.accent', borderColor: 'mask.accent' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'mask.accent', outlineOffset: '2px' },
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
  fontSize: 'sm',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
});

export const switchIndicator = css({
  display: 'inline-block',
  flexShrink: '0',
  width: '8',
  height: '5',
  borderRadius: 'full',
  bg: 'mask.line',
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
    bg: 'mask.text',
    transition: 'transform 0.2s ease',
  },
  '[data-selected] &': {
    bg: 'mask.accent',
    _before: { transform: 'translateX(12px)', bg: 'mask.bg' },
  },
  '[data-focus-visible] &': {
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: 'mask.accent',
    outlineOffset: '2px',
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
  fontSize: 'sm',
});

export const sliderOutput = css({
  fontSize: 'xs',
  color: 'mask.dim',
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
    bg: 'mask.line',
    borderRadius: 'full',
  },
});

export const sliderThumb = css({
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

export const swatchPicker = css({
  display: 'flex',
  gap: '2',
  flexWrap: 'wrap',
});

export const swatchItem = css({
  width: '7',
  height: '7',
  borderRadius: 'sm',
  cursor: 'pointer',
  '&[data-selected]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'mask.accent', outlineOffset: '2px' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'mask.text', outlineOffset: '2px' },
});

export const swatch = css({
  width: 'full',
  height: 'full',
  borderRadius: 'sm',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'mask.line',
});

export const customButton = css({
  alignSelf: 'start',
  padding: '1',
  paddingInline: '3',
  color: 'mask.text',
  bg: 'transparent',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'mask.line',
  borderRadius: 'sm',
  fontSize: 'sm',
  cursor: 'pointer',
  '&[data-hovered]': { borderColor: 'mask.accent' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'mask.accent', outlineOffset: '2px' },
});

export const popover = css({
  bg: 'mask.panel',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'mask.line',
  borderRadius: 'lg',
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
  borderRadius: 'md',
});

export const colorThumb = css({
  width: '[16px]',
  height: '[16px]',
  borderRadius: 'full',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderColor: 'mask.text',
  boxShadow: '[0 0 0 1px rgba(0,0,0,0.4)]',
});

export const hueSlider = css({
  width: '[180px]',
});

export const hueTrack = css({
  height: '6',
  borderRadius: 'full',
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
  color: 'mask.text',
  bg: 'transparent',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'mask.accent',
  borderRadius: 'sm',
  fontSize: 'sm',
  cursor: 'pointer',
  '&[data-hovered]': { color: 'mask.bg', bg: 'mask.accent' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'mask.text', outlineOffset: '2px' },
});

export const recordButton = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2',
  marginTop: '1',
  padding: '2',
  paddingInline: '3',
  color: 'mask.text',
  bg: 'transparent',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'mask.line',
  borderRadius: 'sm',
  fontSize: 'sm',
  fontVariantNumeric: 'tabular-nums',
  cursor: 'pointer',
  '&[data-hovered]': { borderColor: 'mask.rec' },
  '&[data-recording]': { color: 'mask.rec', borderColor: 'mask.rec' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'mask.rec', outlineOffset: '2px' },
});

export const recordDot = css({
  flexShrink: '0',
  width: '3',
  height: '3',
  borderRadius: 'full',
  bg: 'mask.line',
  '[data-recording] &': { bg: 'mask.rec' },
});
