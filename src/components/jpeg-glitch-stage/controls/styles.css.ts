import { css } from 'styled-system/css';

export const root = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '5',
  padding: '5',
  width: '[240px]',
  flexShrink: 0,
  bg: 'stage.panel',
  borderRightWidth: '1px',
  borderRightStyle: 'solid',
  borderRightColor: 'stage.line',
  color: 'stage.text',
  overflowY: 'auto',
});

export const headerRoot = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
  paddingBottom: '3',
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: 'stage.line',
});

export const title = css({ fontSize: 'sm', fontWeight: 'bold', letterSpacing: 'wider' });

export const subtitle = css({ fontSize: 'xs', color: 'stage.dim' });

export const sectionTitle = css({
  fontSize: 'xs',
  color: 'stage.accent',
  letterSpacing: 'widest',
  textTransform: 'uppercase',
  marginTop: '2',
  paddingBottom: '1',
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: 'stage.line',
});

export const slider = css({ display: 'flex', flexDirection: 'column', gap: '2', width: '[100%]' });

export const sliderHeader = css({ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' });

export const sliderLabel = css({ display: 'block', fontSize: 'xs', color: 'stage.dim', letterSpacing: 'wide', textTransform: 'uppercase' });

export const sliderValue = css({ fontSize: 'xs', color: 'stage.text', fontVariantNumeric: 'tabular-nums' });

export const sliderTrack = css({
  position: 'relative',
  height: '[4px]',
  width: '[100%]',
  borderRadius: 'full',
  bg: 'stage.line',
});

export const sliderThumb = css({
  width: '[14px]',
  height: '[14px]',
  borderRadius: 'full',
  bg: 'stage.accent',
  top: '[50%]',
  cursor: 'grab',
  '&[data-dragging]': { cursor: 'grabbing' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'stage.accent', outlineOffset: '2px' },
});

export const radioGroup = css({ display: 'flex', flexDirection: 'column', gap: '2' });

export const radioRow = css({ display: 'flex', gap: '2', position: 'relative' });

export const radio = css({
  flex: '1',
  position: 'relative',
  textAlign: 'center',
  fontSize: 'xs',
  paddingY: '1.5',
  borderRadius: 'md',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'stage.line',
  color: 'stage.dim',
  cursor: 'pointer',
  '&[data-selected]': { borderColor: 'stage.accent', color: 'stage.text', bg: '[rgba(124, 217, 255, 0.12)]' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'stage.accent', outlineOffset: '2px' },
});

export const seedRow = css({ display: 'flex', alignItems: 'flex-end', gap: '2' });

export const seedButton = css({
  flexShrink: 0,
  width: '[32px]',
  height: '[32px]',
  borderRadius: 'md',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'stage.line',
  color: 'stage.text',
  bg: 'transparent',
  cursor: 'pointer',
  '&[data-hovered]': { borderColor: 'stage.accent' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'stage.accent', outlineOffset: '2px' },
});
