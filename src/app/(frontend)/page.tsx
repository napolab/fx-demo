import { css } from 'styled-system/css';

import { EffectIndex } from './_components/effect-index';
import { effects } from './content';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'fluid-simulation — camera FX index',
  description: 'カメラ映像を素材にする WebGPU/WGSL の VJ エフェクト集。Liquid Mirror・JPEG Glitch・Trace を収録した実験のインデックス。',
};

export const viewport: Viewport = {
  themeColor: '#04060a',
};

const main = css({
  minHeight: '100dvh',
  bg: 'stage.bg',
  color: 'stage.text',
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
  fontSize: '4xl',
  fontWeight: 'bold',
  letterSpacing: 'widest',
  lineHeight: 'tight',
  color: 'stage.text',
  '@media (min-width: 768px)': {
    fontSize: '6xl',
  },
});

const heroLead = css({
  marginBlock: '3 0',
  fontSize: 'md',
  color: 'stage.dim',
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
