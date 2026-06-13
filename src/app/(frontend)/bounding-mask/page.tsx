import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { css } from 'styled-system/css';

import { BoundingMask } from '../../../components/bounding-mask';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Bounding Mask — body-part colour masking',
  description:
    'MediaPipe のポーズ検出で顔・手・腰・脚を捉え、選んだ部位を単色マスクで覆う FX。webcam またはアップロード動画に対して、ボックスとシルエットの 2 通りのマスク形状をリアルタイムで切り替えられます。',
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

const BoundingMaskPage = () => (
  <main className={main}>
    <section>
      <h1 className={srOnly}>Bounding Mask — 身体部位の単色マスキング</h1>
      <ErrorBoundary fallback={<p className={fallback}>ボディマスク FX の初期化に失敗しました。再読み込みしてください。</p>}>
        <Suspense fallback={<div className={fallback} aria-hidden="true" />}>
          <BoundingMask />
        </Suspense>
      </ErrorBoundary>
    </section>
  </main>
);

export default BoundingMaskPage;
