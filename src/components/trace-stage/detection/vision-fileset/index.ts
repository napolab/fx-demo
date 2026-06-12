// Shared MediaPipe vision fileset: the WASM loader script declares globals
// (ModuleFactory) and throws if executed twice, so segmenter and pose MUST
// resolve it through this single cached promise.

import type { FilesetResolver } from '@mediapipe/tasks-vision';

type VisionFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;

// Self-hosted from public/mediapipe (copied verbatim from the pinned
// @mediapipe/tasks-vision npm package) — no third-party CDN at runtime.
const WASM_BASE_URL = '/mediapipe/wasm';

// Lazy module-level cache — intentional shared state: the loader script is
// only allowed to execute once per page.
const cache: { fileset: Promise<VisionFileset> | undefined } = { fileset: undefined };

const load = async (): Promise<VisionFileset> => {
  const { FilesetResolver: resolver } = await import('@mediapipe/tasks-vision');
  return resolver.forVisionTasks(WASM_BASE_URL);
};

export const loadVisionFileset = (): Promise<VisionFileset> => {
  cache.fileset = cache.fileset ?? load();
  return cache.fileset;
};
