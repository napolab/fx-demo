'use client';

// Live silhouette threshold control. Adjusts the marching-squares iso-level the
// session traces contours at (0 = include everything, 1 = only the most
// confident silhouette pixels). State lives in the parent hook; this is a thin
// presentational slider wired to it via explicit props.

import { Label, Slider, SliderOutput, SliderThumb, SliderTrack } from 'react-aria-components';

import * as styles from '../styles.css';

// Stable formatter so SliderOutput shows the iso-level as e.g. "0.50".
const THRESHOLD_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 } satisfies Intl.NumberFormatOptions;

type ThresholdSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

export const ThresholdSlider = ({ value, onChange }: ThresholdSliderProps) => (
  <Slider className={styles.sliderRoot} minValue={0} maxValue={1} step={0.01} value={value} onChange={onChange} formatOptions={THRESHOLD_FORMAT}>
    <div className={styles.sliderHeaderRoot}>
      <Label className={styles.sliderLabel}>閾値</Label>
      <SliderOutput className={styles.sliderOutput} />
    </div>
    <SliderTrack className={styles.sliderTrack}>
      <SliderThumb className={styles.sliderThumb} />
    </SliderTrack>
  </Slider>
);
