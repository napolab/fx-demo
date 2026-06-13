import { effects } from '../../content';

import { EffectLink } from './effect-link';
import * as styles from './styles.css';

export const EffectIndex = () => (
  <section>
    <h2 className={styles.srOnly}>作品一覧</h2>
    <ol className={styles.root}>
      {effects.map((effect) => (
        <li key={effect.href} className={styles.item}>
          <article className={styles.card}>
            <span className={styles.no} aria-hidden="true">
              {effect.no}
            </span>
            <img className={styles.thumb} src={effect.thumb} alt={effect.thumbAlt} width={640} height={400} loading="lazy" decoding="async" />
            <div className={styles.body}>
              <h3 className={styles.title}>
                <EffectLink className={styles.link} href={effect.href}>
                  {effect.name}
                </EffectLink>
              </h3>
              <p className={styles.tagline}>{effect.tagline}</p>
              <p className={styles.doing}>{effect.doing}</p>
            </div>
            <span className={styles.open} aria-hidden="true">
              OPEN →
            </span>
          </article>
        </li>
      ))}
    </ol>
  </section>
);
