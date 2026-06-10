'use client';

// Thin React adapter: mounts the imperative trace session and exposes its status.

import { useEffect, useState, type RefObject } from 'react';

import { createTraceSession } from './session';
import type { TraceStatus } from './types';

export const useTraceFx = (canvasRef: RefObject<HTMLCanvasElement | null>, overlayRef: RefObject<HTMLDivElement | null>): TraceStatus => {
  const [status, setStatus] = useState<TraceStatus>('booting');

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: imperative WebGPU/MediaStream/p5 session bound to
    // DOM node lifecycles — cannot be expressed as data fetching or derived state.
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (canvas === null || overlay === null) return;
    const session = createTraceSession(canvas, overlay, setStatus);

    return () => {
      session.dispose();
    };
  }, [canvasRef, overlayRef]);

  return status;
};
