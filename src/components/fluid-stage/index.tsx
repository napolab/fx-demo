'use client';

// "Liquid Mirror" — fullscreen WebGPU stable-fluids canvas. The webcam feed is
// injected into the dye field so the viewer's reflection flows like liquid;
// pointers stir it, Space cycles grade modes, F toggles fullscreen.

import { useEffect, useRef, useState } from 'react';

import * as styles from './styles.css';
import type { FluidStatus } from './types';
import { useFluidSimulation } from './use-fluid-simulation';

const HINT_VISIBLE_MS = 7000;

const noticeText = (status: FluidStatus): string | undefined => {
  switch (status) {
    case 'no-webgpu':
      return 'この流体表現には WebGPU 対応ブラウザが必要です。Chrome / Edge / Arc の最新版でお試しください。';
    case 'lost':
      return 'GPU との接続が失われました。ページを再読み込みしてください。';
    case 'procedural':
      return 'camera off — procedural flow';
    case 'booting':
    case 'running':
      return undefined;
  }
};

const useFadeOut = (delayMs: number): boolean => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // USEEFFECT_JUSTIFICATION: one-shot wall-clock timer to fade the on-stage hints;
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

export const FluidStage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const status = useFluidSimulation(canvasRef);
  const hintVisible = useFadeOut(HINT_VISIBLE_MS);
  const notice = noticeText(status);
  const tone = status === 'procedural' ? 'soft' : 'alert';

  return (
    <div className={styles.root} data-status={status}>
      <canvas ref={canvasRef} className={styles.canvas} data-cursor="visible" role="img" aria-label="流体シミュレーション。ポインタ操作で水面のように攪拌できます。" />
      {notice !== undefined && (
        <p className={styles.notice} data-tone={tone} data-visible={hintVisible ? 'true' : 'false'}>
          {notice}
        </p>
      )}
      <p className={styles.hint} data-visible={hintVisible ? 'true' : 'false'}>
        click: インクを落とす · drag: 攪拌 · Space: ink / 墨 / mirror · F: フルスクリーン
      </p>
    </div>
  );
};
