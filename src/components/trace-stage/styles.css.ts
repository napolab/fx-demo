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
});

export const controlButton = css({
  padding: '2',
  paddingInline: '4',
  color: 'trace.hudText',
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
