'use client';

// "Bounding Mask" — covers MediaPipe-detected body parts (face / hands / hip /
// legs) with a single-colour solid mask over a webcam or uploaded video. The
// mask shape switches between the part bounding box and the person silhouette.
// Detection is reused from the trace stage; only the masking render is new.

import { useCallback, useEffect, useRef, useState } from 'react';

import { BoundingMaskControls } from './controls';
import { Seekbar } from './seekbar';
import * as styles from './styles.css';
import { DEFAULT_PARAMS, type MaskParams } from './types';
import { useBoundingMask } from './use-bounding-mask';

const HINT_VISIBLE_MS = 7000;

const useFadeOut = (delayMs: number): boolean => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: one-shot wall-clock timer to fade the on-stage hint;
    // not derivable from props/state and must be cleaned up on unmount.
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs]);

  return visible;
};

export const BoundingMask = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [params, setParams] = useState<MaskParams>(DEFAULT_PARAMS);
  const paramsRef = useRef<MaskParams>(DEFAULT_PARAMS);
  const { status, playback, isRecording, recordingMs, retryCamera, loadVideoFile, seek, togglePlay, toggleRecording } = useBoundingMask(canvasRef, paramsRef);
  const hintVisible = useFadeOut(HINT_VISIBLE_MS);

  const handleChange = useCallback((patch: Partial<MaskParams>) => {
    setParams((prev) => {
      const next = { ...prev, ...patch };
      paramsRef.current = next;
      return next;
    });
  }, []);

  const handleSelectVideo = useCallback(
    async (files: FileList | null) => {
      const file = files?.item(0);
      if (file === null || file === undefined) return;
      await loadVideoFile(file);
    },
    [loadVideoFile],
  );

  const handleRetryCamera = useCallback(async () => {
    await retryCamera();
  }, [retryCamera]);

  return (
    <div className={styles.root} data-status={status}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="ボディマスク。映像に映る身体の指定部位が単色マスクで覆われます。" />
      <BoundingMaskControls
        params={params}
        onChange={handleChange}
        onSelectVideo={handleSelectVideo}
        onRetryCamera={handleRetryCamera}
        isRecording={isRecording}
        recordingMs={recordingMs}
        onToggleRecording={toggleRecording}
      />
      {status === 'no-camera' && (
        <div className={styles.cameraPrompt}>
          <p>camera off — カメラを許可するか、動画を読み込むとマスクが始まります</p>
        </div>
      )}
      {playback !== null && <Seekbar currentTime={playback.currentTime} duration={playback.duration} paused={playback.paused} onSeek={seek} onTogglePlay={togglePlay} />}
      {playback === null && (
        <p className={styles.hint} data-visible={hintVisible ? 'true' : 'false'}>
          カメラの前で動くと指定部位がマスクされます
        </p>
      )}
    </div>
  );
};
