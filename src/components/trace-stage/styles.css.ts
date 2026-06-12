import { css } from 'styled-system/css';

export const root = css({
  position: 'fixed',
  inset: '0',
  bg: 'trace.bg',
  overflow: 'hidden',
});

export const canvas = css({
  display: 'block',
  width: 'full',
  height: 'full',
});

export const overlay = css({
  position: 'absolute',
  inset: '0',
  pointerEvents: 'none',
  // p5 injects its canvas as a child; pin it to the stage.
  // Exception to no-child-selectors rule: the p5-injected canvas is third-party
  // DOM we cannot class — same category as other allowed &[data-*] exceptions.
  '& canvas': {
    display: 'block',
    width: 'full',
    height: 'full',
  },
});

export const notice = css({
  position: 'absolute',
  inset: '0',
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  padding: '8',
  color: 'trace.text',
  fontSize: 'md',
  lineHeight: 'relaxed',
  pointerEvents: 'none',
  '&[data-tone="soft"]': {
    inset: 'auto',
    top: '4',
    left: '4',
    padding: '0',
    color: 'trace.dim',
    fontSize: 'sm',
    textAlign: 'left',
  },
});

export const sourceRoot = css({
  position: 'absolute',
  top: '4',
  right: '4',
  display: 'grid',
  gap: '2',
  justifyItems: 'stretch',
  width: 'fit-content',
});

export const sliderRoot = css({
  display: 'grid',
  gap: '2',
  padding: '2',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'trace.hud',
  borderRadius: 'sm',
  color: 'trace.text',
  fontFamily: 'mono',
  fontSize: 'sm',
});

export const sliderHeaderRoot = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '4',
});

export const sliderLabel = css({
  color: 'trace.dim',
});

export const sliderOutput = css({
  color: 'trace.text',
  fontFamily: 'mono',
});

export const sliderTrack = css({
  position: 'relative',
  width: 'full',
  height: '1',
  bg: 'trace.dim',
  borderRadius: 'full',
  cursor: 'pointer',
  alignSelf: 'center',
});

export const sliderThumb = css({
  width: '3',
  height: '3',
  borderRadius: 'full',
  bg: 'trace.line',
  cursor: 'pointer',
  '&[data-dragging]': { bg: 'trace.text' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'trace.line', outlineOffset: '2px' },
});

export const controlButton = css({
  padding: '2',
  paddingInline: '4',
  color: 'trace.text',
  bg: 'transparent',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'trace.hud',
  borderRadius: 'sm',
  fontSize: 'sm',
  fontFamily: 'mono',
  cursor: 'pointer',
  '&[data-hovered]': { color: 'trace.bg', bg: 'trace.hud' },
  '&[data-focus-visible]': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'trace.line', outlineOffset: '2px' },
});

export const cameraPrompt = css({
  position: 'absolute',
  top: '4',
  left: '4',
  display: 'grid',
  gap: '2',
  justifyItems: 'start',
  color: 'trace.dim',
  fontSize: 'sm',
  textAlign: 'left',
});

export const hint = css({
  position: 'absolute',
  bottom: '5',
  left: '50%',
  transform: 'translateX(-50%)',
  color: 'trace.dim',
  fontSize: 'sm',
  letterSpacing: 'wide',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  transition: 'opacity 1.2s ease',
  '&[data-visible="false"]': { opacity: '0' },
});
