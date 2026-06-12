'use client';

// Thin React adapter: mounts the imperative PolyTrace session and exposes its status.
// Params travel through a ref so live slider tweaks reach the loops without
// tearing down the camera / GPU session.

import { useEffect, useState, type RefObject } from 'react';

import { createPolyTraceSession } from './session';
import type { PolyTraceParams, PolyTraceStatus } from './types';

export const usePolyTrace = (hostRef: RefObject<HTMLDivElement | null>, paramsRef: RefObject<PolyTraceParams>): PolyTraceStatus => {
  const [status, setStatus] = useState<PolyTraceStatus>('booting');

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: imperative p5/WebGPU/MediaStream session bound to the
    // host DOM node lifecycle — cannot be expressed as data fetching or derived state.
    const host = hostRef.current;
    if (host === null) return;
    const session = createPolyTraceSession(host, setStatus, () => paramsRef.current);

    return () => {
      session.dispose();
    };
  }, [hostRef, paramsRef]);

  return status;
};
