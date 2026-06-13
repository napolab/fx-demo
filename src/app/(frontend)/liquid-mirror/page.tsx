import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { css } from 'styled-system/css';

import { FluidStage } from '../../../components/fluid-stage';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Liquid Mirror — fluid simulation',
  description: 'WebGPU/WGSL stable-fluids VJ canvas. Webcam が液体の鏡になり、ポインタで攪拌すると絹のような渦が流れます。',
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

const Home = () => (
  <main className={main}>
    <section>
      <h1 className={srOnly}>Liquid Mirror — WebGPU 流体シミュレーション</h1>
      <ErrorBoundary fallback={<p className={fallback}>流体シミュレーションの初期化に失敗しました。再読み込みしてください。</p>}>
        <Suspense fallback={<div className={fallback} aria-hidden="true" />}>
          <FluidStage />
        </Suspense>
      </ErrorBoundary>
    </section>
  </main>
);

export default Home;
