import { css } from 'styled-system/css';

export const root = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '5',
  padding: '5',
  width: '[240px]',
  flexShrink: 0,
  bg: 'bg.canvas',
  borderRightWidth: 'default',
  borderRightStyle: 'solid',
  borderRightColor: 'border.strong',
  color: 'fg.default',
  fontFamily: 'mono',
  overflowY: 'auto',
});

export const headerRoot = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
  paddingBottom: '3',
  borderBottomWidth: 'hairline',
  borderBottomStyle: 'solid',
  borderBottomColor: 'border.default',
});

export const title = css({ fontSize: 'sm', fontWeight: 'bold', letterSpacing: 'wider', fontFamily: 'display' });

export const subtitle = css({ fontSize: 'xs', color: 'fg.muted', fontFamily: 'mono' });

export const sectionTitle = css({
  fontSize: 'xs',
  color: 'accent.text',
  fontFamily: 'mono',
  letterSpacing: 'widest',
  textTransform: 'uppercase',
  marginTop: '2',
  paddingBottom: '1',
  borderBottomWidth: 'hairline',
  borderBottomStyle: 'solid',
  borderBottomColor: 'border.default',
});

export const slider = css({ display: 'flex', flexDirection: 'column', gap: '2', width: '[100%]' });

export const sliderHeader = css({ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' });

export const sliderLabel = css({ display: 'block', fontSize: 'xs', color: 'fg.muted', fontFamily: 'mono', letterSpacing: 'wide', textTransform: 'uppercase' });

export const sliderValue = css({ fontSize: 'xs', color: 'fg.default', fontFamily: 'mono', fontVariantNumeric: 'tabular-nums' });

export const sliderTrack = css({
  position: 'relative',
  height: '[4px]',
  width: '[100%]',
  borderRadius: 'none',
  bg: 'border.default',
});

export const sliderThumb = css({
  width: '[14px]',
  height: '[14px]',
  borderRadius: 'none',
  bg: 'accent.solid',
  top: '[50%]',
  cursor: 'grab',
  '&[data-dragging]': { cursor: 'grabbing' },
});

export const toggle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  fontSize: 'xs',
  color: 'fg.default',
  fontFamily: 'mono',
  letterSpacing: 'wide',
  textTransform: 'uppercase',
  cursor: 'pointer',
});

export const toggleBox = css({
  width: '[14px]',
  height: '[14px]',
  borderRadius: 'none',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'border.default',
  flexShrink: 0,
  '&[data-selected]': { bg: 'accent.solid', borderColor: 'accent.solid' },
});

export const radioGroup = css({ display: 'flex', flexDirection: 'column', gap: '2' });

export const radioRow = css({ display: 'flex', gap: '2', position: 'relative' });

export const radio = css({
  flex: '1',
  position: 'relative',
  textAlign: 'center',
  fontSize: 'xs',
  fontFamily: 'mono',
  paddingY: '1.5',
  borderRadius: 'none',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'border.default',
  color: 'fg.muted',
  cursor: 'pointer',
  '&[data-selected]': { borderColor: 'accent.border', color: 'fg.default', bg: 'blue.2' },
});

export const seedRow = css({ display: 'flex', alignItems: 'flex-end', gap: '2' });

export const seedButton = css({
  flexShrink: 0,
  width: '[32px]',
  height: '[32px]',
  borderRadius: 'none',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'border.default',
  color: 'fg.default',
  fontFamily: 'mono',
  bg: 'transparent',
  cursor: 'pointer',
  '&[data-hovered]': { borderColor: 'accent.border' },
});
