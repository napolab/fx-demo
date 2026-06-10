'use client';

// Thin React adapter: mounts the imperative glitch session once and exposes its
// status. Slider params flow through a ref so changes never remount the session.

import { useEffect, useRef, useState, type RefObject } from 'react';

import { createGlitchSession } from './session';
import type { GlitchParams, GlitchStatus } from './types';

export const useJPEGGlitch = (canvasRef: RefObject<HTMLCanvasElement | null>, params: GlitchParams): GlitchStatus => {
  const [status, setStatus] = useState<GlitchStatus>('booting');
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: imperative WebGPU + p5/MediaStream session bound to
    // the canvas DOM node lifecycle — cannot be expressed as data fetching or derived state.
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const session = createGlitchSession(canvas, () => paramsRef.current, setStatus);

    return () => {
      session.dispose();
    };
  }, [canvasRef]);

  return status;
};
