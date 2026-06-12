'use client';

// "PolyTrace" — After Effects の Polytrace プラグイン再現。カメラ映像を WGSL compute で
// 特徴点抽出し、Delaunay 三角形分割したローポリメッシュを p5.js が毎フレーム描画する。

import { useCallback, useRef, useState } from 'react';

import { PolyTraceControls } from './controls';
import * as styles from './styles.css';
import { usePolyTrace } from './use-poly-trace';

import type { PolyTraceParams, PolyTraceStatus } from './types';

const DEFAULT_PARAMS: PolyTraceParams = {
  pointCount: 600,
  displaceAmount: 0.5,
  evolution: 0.15,
  wireframe: false,
  strokeWeight: 1,
  fillEnabled: true,
};

const noticeText = (status: PolyTraceStatus): string | undefined => {
  switch (status) {
    case 'no-webgpu':
      return 'このエフェクトには WebGPU 対応ブラウザが必要です。Chrome / Edge / Arc の最新版でお試しください。';
    case 'no-camera':
      return 'カメラ映像を取得できません。カメラの接続とブラウザの権限を確認してください。';
    case 'booting':
    case 'running':
      return undefined;
  }
};

export const PolyTrace = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useState<PolyTraceParams>(DEFAULT_PARAMS);
  const paramsRef = useRef<PolyTraceParams>(DEFAULT_PARAMS);
  const status = usePolyTrace(hostRef, paramsRef);

  const handleParamsChange = useCallback((patch: Partial<PolyTraceParams>) => {
    const next = { ...paramsRef.current, ...patch };
    paramsRef.current = next;
    setParams(next);
  }, []);

  const notice = noticeText(status);

  return (
    <div className={styles.root} data-status={status}>
      <div ref={hostRef} className={styles.stage} role="img" aria-label="カメラ映像をローポリ三角形メッシュでトレースしたエフェクト映像" />
      {notice !== undefined && <p className={styles.notice}>{notice}</p>}
      <PolyTraceControls params={params} onChange={handleParamsChange} />
    </div>
  );
};
