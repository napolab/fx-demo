'use client';

// Thin React adapter: mounts the imperative fluid session and exposes its status.

import { useEffect, useState, type RefObject } from 'react';

import { createFluidSession } from './session';
import type { FluidStatus } from './types';

export const useFluidSimulation = (canvasRef: RefObject<HTMLCanvasElement | null>): FluidStatus => {
  const [status, setStatus] = useState<FluidStatus>('booting');

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: imperative WebGPU/MediaStream session bound to the
    // canvas DOM node lifecycle — cannot be expressed as data fetching or derived state.
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const session = createFluidSession(canvas, setStatus);

    return () => {
      session.dispose();
    };
  }, [canvasRef]);

  return status;
};
