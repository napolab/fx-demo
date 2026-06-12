import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { css } from 'styled-system/css';

import { PolyTrace } from '../../../components/poly-trace';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'PolyTrace — camera low-poly tracer',
  description: 'After Effects の Polytrace プラグイン再現。カメラ映像を WGSL で特徴点抽出し、Delaunay 三角形のローポリメッシュとして p5.js が描画します。',
};

export const viewport: Viewport = {
  themeColor: '#04060a',
};

const main = css({ minHeight: '100dvh', bg: 'stage.bg' });
const srOnly = css({ srOnly: true });
const fallback = css({
  position: 'fixed',
  inset: '0',
  display: 'grid',
  placeItems: 'center',
  bg: 'stage.bg',
  color: 'stage.dim',
  fontSize: 'sm',
});

const PolyTracePage = () => (
  <main className={main}>
    <section>
      <h1 className={srOnly}>PolyTrace — カメラ映像のローポリトレース</h1>
      <ErrorBoundary fallback={<p className={fallback}>エフェクトの初期化に失敗しました。再読み込みしてください。</p>}>
        <Suspense fallback={<div className={fallback} aria-hidden="true" />}>
          <PolyTrace />
        </Suspense>
      </ErrorBoundary>
    </section>
  </main>
);

export default PolyTracePage;
