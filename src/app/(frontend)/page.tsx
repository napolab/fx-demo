import { css } from 'styled-system/css';

import { EffectIndex } from './_components/effect-index';
import { effects } from './content';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'fluid-simulation — camera FX index',
  description: 'カメラ映像を素材にする WebGPU/WGSL の VJ エフェクト集。Liquid Mirror・JPEG Glitch・Trace を収録した実験のインデックス。',
};

export const viewport: Viewport = {
  themeColor: '#eef0f3',
};

const main = css({
  minHeight: '100dvh',
  bg: 'bg.canvas',
  color: 'fg.default',
  paddingInline: '5',
  paddingBlock: '16',
  '@media (min-width: 768px)': {
    paddingInline: '10',
    paddingBlock: '24',
  },
});

const inner = css({
  width: '100%',
  maxWidth: '4xl',
  marginInline: 'auto',
});

const hero = css({
  marginBottom: '12',
});

const heroTitle = css({
  margin: '0',
  fontFamily: 'display',
  fontSize: 'display',
  fontWeight: 'normal',
  letterSpacing: 'tight',
  lineHeight: 'none',
  color: 'fg.default',
});

const heroLead = css({
  marginBlock: '4 0',
  fontFamily: 'mono',
  fontSize: 'sm',
  letterSpacing: 'wide',
  color: 'fg.muted',
});

const Home = () => (
  <main className={main}>
    <div className={inner}>
      <section className={hero}>
        <h1 className={heroTitle}>FLUID SIMULATION</h1>
        <p className={heroLead}>カメラを素材にする {effects.length} つの実験</p>
      </section>
      <EffectIndex />
    </div>
  </main>
);

export default Home;
