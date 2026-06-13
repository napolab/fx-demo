import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { css } from 'styled-system/css';

import { JPEGGlitchStage } from '../../../components/jpeg-glitch-stage';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'JPEG Glitch — broken codec mirror',
  description: 'AE の JPEG Glitch をライブカメラで再現。YCbCr / 8x8 DCT / 量子化を WebGPU 上で実際に通し、係数をリアルタイムに破壊します。',
};

export const viewport: Viewport = {
  themeColor: '#04060a',
};

const main = css({ minHeight: '100dvh', bg: 'video.floor' });
const srOnly = css({ srOnly: true });
const fallback = css({
  position: 'fixed',
  inset: '0',
  display: 'grid',
  placeItems: 'center',
  bg: 'video.floor',
  color: 'fg.onSolid',
  fontFamily: 'mono',
  fontSize: 'sm',
});

const JPEGGlitchPage = () => (
  <main className={main}>
    <section>
      <h1 className={srOnly}>JPEG Glitch — カメラ映像のリアルタイム JPEG 破壊</h1>
      <ErrorBoundary fallback={<p className={fallback}>JPEG Glitch の初期化に失敗しました。再読み込みしてください。</p>}>
        <Suspense fallback={<div className={fallback} aria-hidden="true" />}>
          <JPEGGlitchStage />
        </Suspense>
      </ErrorBoundary>
    </section>
  </main>
);

export default JPEGGlitchPage;
