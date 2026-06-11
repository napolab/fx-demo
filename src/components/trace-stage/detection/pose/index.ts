// MediaPipe PoseLandmarker wrapper — the only file that touches the pose ML
// runtime. Returns undefined on any load failure; the session treats pose as
// a soft dependency (trace lines keep working without part boxes).

import type { PoseLandmark } from '../../types';

// Self-hosted from public/mediapipe (same policy as the segmenter) — no
// third-party CDN at runtime.
const WASM_BASE_URL = '/mediapipe/wasm';
const MODEL_URL = '/mediapipe/models/pose_landmarker_lite.task';
const MAX_POSES = 2;

export type PoseDetector = {
  // Returns one landmark list (33 points, normalized UV + visibility) per
  // detected person; empty when nobody is in frame.
  detectFrame: (source: TexImageSource, timestampMs: number) => readonly (readonly PoseLandmark[])[];
  close: () => void;
};

export const createPoseDetector = async (): Promise<PoseDetector | undefined> => {
  try {
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
    const landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: MAX_POSES,
    });

    return {
      detectFrame(source, timestampMs) {
        const result = landmarker.detectForVideo(source, timestampMs);
        // Copy out — the result is recycled by the WASM runtime.
        return result.landmarks.map((pose) => pose.map((landmark) => ({ x: landmark.x, y: landmark.y, visibility: landmark.visibility ?? 1 })));
      },
      close() {
        landmarker.close();
      },
    };
  } catch {
    return undefined;
  }
};
