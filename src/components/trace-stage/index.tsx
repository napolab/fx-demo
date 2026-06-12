'use client';

// "Trace" — TouchDesigner-style trace & blob tracking FX. The webcam silhouette
// is contour-traced in green wireframe with echo trails; blob bboxes, HUD
// labels and plexus wires render on a transparent p5 canvas above the WGSL
// graded video layer.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, FileTrigger } from 'react-aria-components';

import * as styles from './styles.css';
import { ThresholdSlider } from './threshold-slider';
import type { TraceStatus } from './types';
import { useTraceFx } from './use-trace-fx';

const HINT_VISIBLE_MS = 7000;

const noticeText = (status: TraceStatus): string | undefined => {
  switch (status) {
    case 'no-webgpu':
      return 'この表現には WebGPU 対応ブラウザが必要です。Chrome / Edge / Arc の最新版でお試しください。';
    case 'lost':
      return 'GPU との接続が失われました。ページを再読み込みしてください。';
    case 'model-error':
      return '検出モデルの読み込みに失敗しました。ネットワークを確認して再読み込みしてください。';
    // no-camera renders its own retry prompt instead of a passive notice.
    case 'no-camera':
    case 'booting':
    case 'running':
      return undefined;
  }
};

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

export const TraceStage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { status, retryCamera, loadVideoFile, maskThreshold, setMaskThreshold } = useTraceFx(canvasRef, overlayRef);
  const hintVisible = useFadeOut(HINT_VISIBLE_MS);
  const notice = noticeText(status);

  const handleSelectVideo = useCallback(
    async (files: FileList | null) => {
      const file = files?.item(0);
      if (file === null || file === undefined) return;
      await loadVideoFile(file);
    },
    [loadVideoFile],
  );

  return (
    <div className={styles.root} data-status={status}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="輪郭トレース。映像に映る身体の輪郭がワイヤーフレームでトレースされます。" />
      <div ref={overlayRef} className={styles.overlay} aria-hidden="true" />
      <div className={styles.sourceRoot}>
        <FileTrigger acceptedFileTypes={['video/mp4', 'video/webm']} onSelect={handleSelectVideo}>
          <Button className={styles.controlButton}>動画を読み込む (mp4 / webm)</Button>
        </FileTrigger>
        <ThresholdSlider value={maskThreshold} onChange={setMaskThreshold} />
      </div>
      {notice !== undefined && (
        <p className={styles.notice} data-tone="alert">
          {notice}
        </p>
      )}
      {status === 'no-camera' && (
        <div className={styles.cameraPrompt}>
          <p>camera off — カメラを許可すると身体のトレースが始まります</p>
          <Button className={styles.controlButton} onPress={retryCamera}>
            カメラを再試行
          </Button>
        </div>
      )}
      <p className={styles.hint} data-visible={hintVisible ? 'true' : 'false'}>
        カメラの前で動くと輪郭がトレースされます · F: フルスクリーン
      </p>
    </div>
  );
};
