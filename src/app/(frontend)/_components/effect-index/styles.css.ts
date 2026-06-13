import { css } from 'styled-system/css';

export const srOnly = css({ srOnly: true });

export const root = css({
  containerType: 'inline-size',
  display: 'flex',
  flexDirection: 'column',
  listStyle: 'none',
  margin: '0',
  padding: '0',
  borderTopWidth: 'hairline',
  borderTopStyle: 'solid',
  borderTopColor: 'border.default',
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
  borderBottomWidth: 'hairline',
  borderBottomStyle: 'solid',
  borderBottomColor: 'border.default',
  transition: 'background-color 0.18s ease',
  '&:hover': {
    bg: 'bg.subtle',
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
  fontFamily: 'mono',
  fontSize: 'xl',
  fontWeight: 'bold',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: 'wide',
  color: 'fg.subtle',
  '@container (min-width: 600px)': {
    fontSize: 'h2',
    width: '12',
    textAlign: 'right',
  },
});

export const thumb = css({
  display: 'block',
  width: '100%',
  aspectRatio: '16 / 10',
  objectFit: 'cover',
  borderRadius: 'none',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'border.default',
  bg: 'video.floor',
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
  fontFamily: 'display',
  fontSize: 'xl',
  fontWeight: 'semibold',
  letterSpacing: 'tight',
  lineHeight: 'tight',
  color: 'fg.default',
});

// stretched link: covers the whole card so the entire row is clickable, while
// the accessible name stays the effect name only. The hit-area uses ::before so
// the global marching-ants focus ring (drawn on ::after) doesn't collide; both
// anchor to the positioned card.
export const link = css({
  color: 'fg.default',
  textDecoration: 'none',
  outline: 'none',
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: '0',
  },
  '&[data-hovered]': {
    color: 'accent.text',
  },
});

export const tagline = css({
  margin: '0',
  fontSize: 'sm',
  color: 'fg.muted',
});

export const doing = css({
  margin: '0',
  fontFamily: 'mono',
  fontSize: 'xs',
  lineHeight: 'body',
  color: 'fg.subtle',
});

export const open = css({
  flexShrink: '0',
  fontFamily: 'mono',
  fontSize: 'xs',
  letterSpacing: 'wide',
  textTransform: 'uppercase',
  color: 'fg.subtle',
  '@container (min-width: 600px)': {
    alignSelf: 'center',
  },
});
