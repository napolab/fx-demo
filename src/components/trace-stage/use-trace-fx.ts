'use client';

// Thin React adapter: mounts the imperative trace session and exposes its
// status plus a camera-permission retry command.

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { createTraceSession, type TraceSession } from './session';
import type { TraceStatus } from './types';

export type TraceFx = {
  status: TraceStatus;
  retryCamera: () => Promise<void>;
  loadVideoFile: (file: File) => Promise<void>;
  maskThreshold: number;
  setMaskThreshold: (value: number) => void;
};

export const useTraceFx = (canvasRef: RefObject<HTMLCanvasElement | null>, overlayRef: RefObject<HTMLDivElement | null>): TraceFx => {
  const [status, setStatus] = useState<TraceStatus>('booting');
  // 0.5 mirrors the session default MASK_THRESHOLD.
  const [maskThreshold, setThresholdState] = useState(0.5);
  const sessionRef = useRef<TraceSession | undefined>(undefined);

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: imperative WebGPU/MediaStream/p5 session bound to
    // DOM node lifecycles — cannot be expressed as data fetching or derived state.
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (canvas === null || overlay === null) return;
    const session = createTraceSession(canvas, overlay, setStatus);
    sessionRef.current = session;

    return () => {
      sessionRef.current = undefined;
      session.dispose();
    };
  }, [canvasRef, overlayRef]);

  const retryCamera = useCallback(async () => {
    await sessionRef.current?.retryCamera();
  }, []);

  const loadVideoFile = useCallback(async (file: File) => {
    await sessionRef.current?.loadVideoFile(file);
  }, []);

  const setMaskThreshold = useCallback((value: number) => {
    setThresholdState(value);
    sessionRef.current?.setMaskThreshold(value);
  }, []);

  return useMemo(() => ({ status, retryCamera, loadVideoFile, maskThreshold, setMaskThreshold }), [status, retryCamera, loadVideoFile, maskThreshold, setMaskThreshold]);
};
