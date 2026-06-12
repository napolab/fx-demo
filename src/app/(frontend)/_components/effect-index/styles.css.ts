import { css } from 'styled-system/css';

export const srOnly = css({ srOnly: true });

export const root = css({
  containerType: 'inline-size',
  display: 'flex',
  flexDirection: 'column',
  listStyle: 'none',
  margin: '0',
  padding: '0',
});

export const item = css({
  margin: '0',
});

export const card = css({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '3',
  paddingBlock: '6',
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  borderBottomColor: 'stage.line',
  transition: 'background-color 0.2s ease',
  '&:hover': {
    bg: 'rgba(124, 217, 255, 0.04)',
  },
  '@container (min-width: 600px)': {
    flexDirection: 'row',
    alignItems: 'center',
    gap: '6',
    paddingInline: '2',
  },
});

export const no = css({
  flexShrink: '0',
  fontSize: '2xl',
  fontWeight: 'bold',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: 'wide',
  color: 'stage.dim',
  '@container (min-width: 600px)': {
    fontSize: '3xl',
    width: '12',
    textAlign: 'right',
  },
});

export const thumb = css({
  display: 'block',
  width: '100%',
  aspectRatio: '16 / 10',
  objectFit: 'cover',
  borderRadius: 'md',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'stage.line',
  bg: 'stage.bg',
  '@container (min-width: 600px)': {
    width: '52',
    flexShrink: '0',
  },
});

export const body = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
  flex: '1',
  minWidth: '0',
});

export const title = css({
  margin: '0',
  fontSize: 'xl',
  fontWeight: 'semibold',
  lineHeight: 'tight',
  color: 'stage.text',
});

// stretched link: covers the whole card so the entire row is clickable,
// while the accessible name stays the effect name only.
export const link = css({
  color: 'stage.text',
  textDecoration: 'none',
  outline: 'none',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: '0',
    borderRadius: 'md',
  },
  '&[data-hovered]': {
    color: 'stage.accent',
  },
  '&[data-focus-visible]::after': {
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: 'stage.accent',
    outlineOffset: '2px',
  },
});

export const tagline = css({
  margin: '0',
  fontSize: 'sm',
  color: 'stage.text',
});

export const doing = css({
  margin: '0',
  fontSize: 'sm',
  lineHeight: 'relaxed',
  color: 'stage.dim',
});

export const open = css({
  flexShrink: '0',
  fontSize: 'sm',
  color: 'stage.dim',
  '@container (min-width: 600px)': {
    alignSelf: 'center',
  },
});
