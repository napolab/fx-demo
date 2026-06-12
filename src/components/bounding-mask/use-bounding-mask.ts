'use client';

// Thin React adapter: mounts the imperative bounding-mask session and exposes
// its status, playback (file source) and recording state plus the source
// actions. Params travel through a ref so live control tweaks reach the RAF
// loop without tearing down the camera; playback/recording state is polled from
// the media element since it changes outside React.

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { createBoundingMaskSession, type BoundingMaskSession, type Playback } from './session';
import type { MaskParams, Status } from './types';

const PLAYBACK_POLL_MS = 100;

export type BoundingMaskApi = {
  status: Status;
  playback: Playback | null;
  isRecording: boolean;
  recordingMs: number;
  retryCamera: () => Promise<void>;
  loadVideoFile: (file: File) => Promise<void>;
  seek: (time: number) => void;
  togglePlay: () => Promise<void>;
  toggleRecording: () => void;
};

export const useBoundingMask = (canvasRef: RefObject<HTMLCanvasElement | null>, paramsRef: RefObject<MaskParams>): BoundingMaskApi => {
  const [status, setStatus] = useState<Status>('booting');
  const [playback, setPlayback] = useState<Playback | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const sessionRef = useRef<BoundingMaskSession | null>(null);

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: imperative MediaStream/MediaPipe/canvas session bound
    // to the canvas DOM node lifecycle — not data fetching or derived state.
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const session = createBoundingMaskSession(canvas, setStatus, () => paramsRef.current);
    sessionRef.current = session;

    return () => {
      session.dispose();
      sessionRef.current = null;
    };
  }, [canvasRef, paramsRef]);

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: poll the imperative media element + recorder (an
    // external DOM source that mutates outside React) to drive the seekbar and
    // the REC timer. Webcam/idle poll resolves to stable values → no re-render.
    const id = window.setInterval(() => {
      const session = sessionRef.current;
      setPlayback(session?.getPlayback() ?? null);
      setIsRecording(session?.isRecording() ?? false);
      setRecordingMs(session?.getRecordingMs() ?? 0);
    }, PLAYBACK_POLL_MS);

    return () => window.clearInterval(id);
  }, []);

  const retryCamera = useCallback(async () => {
    await sessionRef.current?.retryCamera();
  }, []);

  const loadVideoFile = useCallback(async (file: File) => {
    await sessionRef.current?.loadVideoFile(file);
  }, []);

  const seek = useCallback((time: number) => {
    sessionRef.current?.seek(time);
  }, []);

  const togglePlay = useCallback(async () => {
    await sessionRef.current?.togglePlay();
  }, []);

  const toggleRecording = useCallback(() => {
    const session = sessionRef.current;
    if (session === null) return;
    if (session.isRecording()) {
      session.stopRecording();
      return;
    }
    session.startRecording();
  }, []);

  return { status, playback, isRecording, recordingMs, retryCamera, loadVideoFile, seek, togglePlay, toggleRecording };
};
