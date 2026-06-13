import { css } from 'styled-system/css';

// A container query matches the nearest ANCESTOR container, never the element
// that declares it — so `root` only establishes the container and the flex
// layout lives one level down on `layoutRoot`.
export const root = css({
  height: '100dvh',
  bg: 'video.floor',
  containerType: 'inline-size',
});

export const layoutRoot = css({
  display: 'flex',
  height: '[100%]',
  '@container (max-width: 700px)': {
    flexDirection: 'column-reverse',
  },
});

export const stageRoot = css({
  position: 'relative',
  flex: '1',
  minWidth: '0',
  minHeight: '0',
});

export const canvas = css({
  position: 'absolute',
  inset: '0',
  width: '[100%]',
  height: '[100%]',
  display: 'block',
});

export const notice = css({
  position: 'absolute',
  left: '[50%]',
  bottom: '6',
  transform: 'translateX(-50%)',
  maxWidth: '[80%]',
  paddingX: '4',
  paddingY: '2',
  borderRadius: 'none',
  bg: 'bg.canvas',
  fontSize: 'sm',
  fontFamily: 'mono',
  textAlign: 'center',
  color: 'fg.default',
  '&[data-tone="soft"]': { color: 'fg.muted' },
});
