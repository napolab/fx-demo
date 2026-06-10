'use client';

// "JPEG Glitch" — live camera through a real (and really broken) JPEG pipeline.
// Left panel = AE-style effect controls; right = the WebGPU glitch canvas.

import { useCallback, useRef, useState } from 'react';

import { GlitchControls, type NumericField } from './controls';
import * as styles from './styles.css';
import { DEFAULT_PARAMS, type BlockSize, type GlitchParams, type GlitchStatus } from './types';
import { useJPEGGlitch } from './use-jpeg-glitch';

const SEED_RANGE = 10000;

const noticeText = (status: GlitchStatus): string | undefined => {
  switch (status) {
    case 'no-webgpu':
      return 'この表現には WebGPU 対応ブラウザが必要です。Chrome / Edge / Arc の最新版でお試しください。';
    case 'no-camera':
      return 'カメラにアクセスできませんでした。カメラを許可してから再読み込みしてください。';
    case 'lost':
      return 'GPU との接続が失われました。ページを再読み込みしてください。';
    case 'booting':
      return 'カメラを起動しています…';
    case 'running':
      return undefined;
  }
};

export const JPEGGlitchStage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [params, setParams] = useState<GlitchParams>(DEFAULT_PARAMS);
  const status = useJPEGGlitch(canvasRef, params);
  const notice = noticeText(status);

  const handleChangeField = useCallback((field: NumericField, value: number) => {
    setParams((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleChangeBlockSize = useCallback((blockSize: BlockSize) => {
    setParams((previous) => ({ ...previous, blockSize }));
  }, []);

  const handleRandomizeSeed = useCallback(() => {
    setParams((previous) => ({ ...previous, seed: Math.floor(Math.random() * SEED_RANGE) }));
  }, []);

  return (
    <div className={styles.root} data-status={status}>
      <div className={styles.layoutRoot}>
        <GlitchControls params={params} onChangeField={handleChangeField} onChangeBlockSize={handleChangeBlockSize} onRandomizeSeed={handleRandomizeSeed} />
        <div className={styles.stageRoot}>
          <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="JPEG グリッチを適用したカメラ映像。左のパネルで破壊量を調整できます。" />
          {notice !== undefined && (
            <p className={styles.notice} data-tone={status === 'booting' ? 'soft' : 'alert'}>
              {notice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
