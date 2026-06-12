'use client';

// AE Effect Controls-style parameter panel. Each slider reports through a
// single (field, value) callback so the stage owns the params object.

import { useCallback } from 'react';
import { Button, Label, Radio, RadioGroup, Slider, SliderOutput, SliderThumb, SliderTrack } from 'react-aria-components';

import * as styles from './styles.css';
import type { BlockSize, GlitchParams } from '../types';

export type NumericField = 'amount' | 'quality' | 'tableChaos' | 'chroma' | 'shift' | 'seed';

export type GlitchControlsProps = {
  params: GlitchParams;
  onChangeField: (field: NumericField, value: number) => void;
  onChangeBlockSize: (value: BlockSize) => void;
  onRandomizeSeed: () => void;
};

type ParamSliderProps = {
  field: NumericField;
  label: string;
  value: number;
  maxValue: number;
  onChangeField: (field: NumericField, value: number) => void;
};

const ParamSlider = ({ field, label, value, maxValue, onChangeField }: ParamSliderProps) => {
  const handleChange = useCallback(
    (next: number | number[]) => {
      if (typeof next === 'number') onChangeField(field, next);
    },
    [field, onChangeField],
  );

  return (
    <Slider className={styles.slider} value={value} minValue={0} maxValue={maxValue} step={1} onChange={handleChange}>
      <div className={styles.sliderHeader}>
        <Label className={styles.sliderLabel}>{label}</Label>
        <SliderOutput className={styles.sliderValue} />
      </div>
      <SliderTrack className={styles.sliderTrack}>
        <SliderThumb className={styles.sliderThumb} />
      </SliderTrack>
    </Slider>
  );
};

const toBlockSize = (value: string): BlockSize => {
  switch (value) {
    case '16':
      return 16;
    case '32':
      return 32;
    default:
      return 8;
  }
};

export const GlitchControls = ({ params, onChangeField, onChangeBlockSize, onRandomizeSeed }: GlitchControlsProps) => {
  const handleBlockChange = useCallback(
    (value: string) => {
      onChangeBlockSize(toBlockSize(value));
    },
    [onChangeBlockSize],
  );

  return (
    <aside className={styles.root} aria-label="JPEG Glitch エフェクトコントロール">
      <header className={styles.headerRoot}>
        <p className={styles.title}>fx JPEG Glitch</p>
        <p className={styles.subtitle}>broken codec mirror</p>
      </header>
      <ParamSlider field="amount" label="Amount" value={params.amount} maxValue={100} onChangeField={onChangeField} />
      <ParamSlider field="quality" label="Quality" value={params.quality} maxValue={100} onChangeField={onChangeField} />
      <ParamSlider field="tableChaos" label="Table Chaos" value={params.tableChaos} maxValue={100} onChangeField={onChangeField} />
      <RadioGroup className={styles.radioGroup} value={`${params.blockSize}`} onChange={handleBlockChange}>
        <Label className={styles.sliderLabel}>Block Size</Label>
        <div className={styles.radioRow}>
          <Radio className={styles.radio} value="8">
            8
          </Radio>
          <Radio className={styles.radio} value="16">
            16
          </Radio>
          <Radio className={styles.radio} value="32">
            32
          </Radio>
        </div>
      </RadioGroup>
      <ParamSlider field="chroma" label="Chroma" value={params.chroma} maxValue={100} onChangeField={onChangeField} />
      <ParamSlider field="shift" label="Shift" value={params.shift} maxValue={100} onChangeField={onChangeField} />
      <div className={styles.seedRow}>
        <ParamSlider field="seed" label="Seed" value={params.seed} maxValue={9999} onChangeField={onChangeField} />
        <Button className={styles.seedButton} onPress={onRandomizeSeed} aria-label="シードをランダム化">
          ↻
        </Button>
      </div>
    </aside>
  );
};
