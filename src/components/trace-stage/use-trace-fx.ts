'use client';

// Thin React adapter: mounts the imperative trace session and exposes its
// status plus a camera-permission retry command.

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

import { createTraceSession, type TraceSession } from './session';
import type { TraceStatus } from './types';

const RECORDING_POLL_MS = 100;

export type TraceFx = {
  status: TraceStatus;
  retryCamera: () => Promise<void>;
  loadVideoFile: (file: File) => Promise<void>;
  maskThreshold: number;
  setMaskThreshold: (value: number) => void;
  maskFace: boolean;
  setMaskFace: (value: boolean) => void;
  isRecording: boolean;
  recordingMs: number;
  toggleRecording: () => void;
};

export const useTraceFx = (canvasRef: RefObject<HTMLCanvasElement | null>, overlayRef: RefObject<HTMLDivElement | null>): TraceFx => {
  const [status, setStatus] = useState<TraceStatus>('booting');
  // 0.5 mirrors the session default MASK_THRESHOLD.
  const [maskThreshold, setThresholdState] = useState(0.5);
  // false mirrors the session default (face censor off).
  const [maskFace, setMaskFaceState] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
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

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: poll the imperative MediaRecorder (an external
    // source mutating outside React) to drive the REC indicator + timer. Idle
    // polls resolve to stable values → no re-render.
    const id = window.setInterval(() => {
      const session = sessionRef.current;
      setIsRecording(session?.isRecording() ?? false);
      setRecordingMs(session?.getRecordingMs() ?? 0);
    }, RECORDING_POLL_MS);

    return () => window.clearInterval(id);
  }, []);

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

  const setMaskFace = useCallback((value: boolean) => {
    setMaskFaceState(value);
    sessionRef.current?.setMaskFace(value);
  }, []);

  const toggleRecording = useCallback(() => {
    const session = sessionRef.current;
    if (session === undefined) return;
    if (session.isRecording()) {
      session.stopRecording();
      return;
    }
    session.startRecording();
  }, []);

  return useMemo(
    () => ({ status, retryCamera, loadVideoFile, maskThreshold, setMaskThreshold, maskFace, setMaskFace, isRecording, recordingMs, toggleRecording }),
    [status, retryCamera, loadVideoFile, maskThreshold, setMaskThreshold, maskFace, setMaskFace, isRecording, recordingMs, toggleRecording],
  );
};
