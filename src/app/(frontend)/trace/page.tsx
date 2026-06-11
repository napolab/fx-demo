import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { css } from 'styled-system/css';

import { TraceStage } from '../../../components/trace-stage';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Trace — body wireframe tracking',
  description: 'WebGPU/WGSL + p5.js のトレース & ブロブトラッキング FX。カメラに映る身体の輪郭がモノクロのワイヤーフレームでトレースされ、残像とトラッキング HUD が重なります。',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
};

const main = css({ minHeight: '100dvh', bg: 'trace.bg' });
const srOnly = css({ srOnly: true });
const fallback = css({
  position: 'fixed',
  inset: '0',
  display: 'grid',
  placeItems: 'center',
  bg: 'trace.bg',
  color: 'trace.dim',
  fontSize: 'sm',
});

const TracePage = () => (
  <main className={main}>
    <section>
      <h1 className={srOnly}>Trace — 身体輪郭のワイヤーフレームトラッキング</h1>
      <ErrorBoundary fallback={<p className={fallback}>トレース FX の初期化に失敗しました。再読み込みしてください。</p>}>
        <Suspense fallback={<div className={fallback} aria-hidden="true" />}>
          <TraceStage />
        </Suspense>
      </ErrorBoundary>
    </section>
  </main>
);

export default TracePage;
