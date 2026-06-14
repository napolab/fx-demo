import { effects } from '../../content';

import { EffectLink } from './effect-link';
import { pack } from './skyline/pack';
import * as styles from './styles.css';

import type { Placement } from './skyline/pack';
import type { CSSProperties } from 'react';

// Every FX thumbnail is 16:10, so a single ratio drives every cell's height
// (height = span * ratio cw). The first effect is featured at span 2; the rest
// are span 1 — visual variety without an aspect heuristic.
const RATIO = 800 / 1280;

// Column counts per breakpoint: base (mobile) / tablet / desktop. The packing runs
// once for each on the server; CSS picks the matching cw-unit coordinates per cell,
// so the layout needs no measurement and never shifts. No 'use client' — pure render.
// Tuned for 5 cards: 2 columns on mobile, 3 on tablet and desktop.
const COLUMN_COUNTS = [2, 3, 3] as const;

const items = effects.map((effect, index) => ({ id: effect.href, ratio: RATIO, span: index === 0 ? 2 : 1 }));

// Publish each cell's cw-unit position/size for all three column counts; the cell CSS
// selects the active set per breakpoint and scales it with 100cqw / --cols. The three
// counts map to var suffixes -2 / -3 / -4 (index order), matching styles.css.ts.
const cellVars = (a: Placement, b: Placement, c: Placement): CSSProperties =>
  ({
    '--col-2': `${a.col}`,
    '--span-2': `${a.span}`,
    '--y-2': `${a.y}`,
    '--h-2': `${a.height}`,
    '--col-3': `${b.col}`,
    '--span-3': `${b.span}`,
    '--y-3': `${b.y}`,
    '--h-3': `${b.height}`,
    '--col-4': `${c.col}`,
    '--span-4': `${c.span}`,
    '--y-4': `${c.y}`,
    '--h-4': `${c.height}`,
  }) as CSSProperties;

const totalVars = (totals: readonly number[]): CSSProperties => ({ '--total-2': `${totals[0]}`, '--total-3': `${totals[1]}`, '--total-4': `${totals[2]}` }) as CSSProperties;

const FALLBACK: Placement = { id: '', col: 0, span: 1, y: 0, height: RATIO };

export const EffectIndex = () => {
  const layouts = COLUMN_COUNTS.map((cols) => pack(items, cols));

  // Every effect is placed in every layout; the fallback only keeps the types total.
  const placementOf = (id: string, layoutIndex: number): Placement => layouts[layoutIndex]?.placements.find((p) => p.id === id) ?? FALLBACK;

  return (
    <section>
      <h2 className={styles.srOnly}>作品一覧</h2>
      <ol className={styles.root} style={totalVars(layouts.map((layout) => layout.totalHeight))}>
        {effects.map((effect) => (
          <li key={effect.href} className={styles.cell} style={cellVars(placementOf(effect.href, 0), placementOf(effect.href, 1), placementOf(effect.href, 2))}>
            {/* Empty skyline gaps are left as the page background (no decorative filler cells). */}
            <img className={styles.thumb} src={effect.thumb} alt={effect.thumbAlt} width={1280} height={800} loading="lazy" decoding="async" />
            <div className={styles.caption}>
              <h3 className={styles.title}>
                <span className={styles.no} aria-hidden="true">
                  {effect.no}
                </span>
                {effect.name}
              </h3>
              <span className={styles.open} aria-hidden="true">
                OPEN →
              </span>
            </div>
            {/* Stretched link: a direct child of the positioned cell so its ::before
                hit-area (and the global marching-ants ::after focus ring) cover the
                WHOLE tile, not just the caption bar. Visible name lives in the h3; the
                link carries the accessible name via srOnly text. */}
            <EffectLink className={styles.link} href={effect.href}>
              <span className={styles.srOnly}>{effect.name}</span>
            </EffectLink>
          </li>
        ))}
      </ol>
    </section>
  );
};
