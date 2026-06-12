'use client';

// AE Effect Controls-style parameter panel mirroring the aescripts JPEG glitch
// plugin: a compression section (compression ratio + broken bytes) and a
// quantization-tables section (QTC override + random table breaking). Each
// slider reports through a single (field, value) callback so the stage owns
// the params object.

import { useCallback } from 'react';
import { Button, Label, Radio, RadioGroup, Slider, SliderOutput, SliderThumb, SliderTrack } from 'react-aria-components';

import * as styles from './styles.css';
import type { BlockSize, GlitchParams } from '../types';

export type NumericField = 'compression' | 'brokenBytes' | 'qtcPosition' | 'qtcValue' | 'breakingBytes' | 'maxRandom' | 'chroma' | 'seed';

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
  minValue?: number;
  maxValue: number;
  onChangeField: (field: NumericField, value: number) => void;
};

const ParamSlider = ({ field, label, value, minValue = 0, maxValue, onChangeField }: ParamSliderProps) => {
  const handleChange = useCallback(
    (next: number | number[]) => {
      if (typeof next === 'number') onChangeField(field, next);
    },
    [field, onChangeField],
  );

  return (
    <Slider className={styles.slider} value={value} minValue={minValue} maxValue={maxValue} step={1} onChange={handleChange}>
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
      <p className={styles.sectionTitle}>compression</p>
      <ParamSlider field="compression" label="Compression" value={params.compression} maxValue={100} onChangeField={onChangeField} />
      <ParamSlider field="brokenBytes" label="Broken Bytes" value={params.brokenBytes} maxValue={100} onChangeField={onChangeField} />
      <p className={styles.sectionTitle}>quantization tables</p>
      <ParamSlider field="qtcPosition" label="QTC Position" value={params.qtcPosition} minValue={1} maxValue={64} onChangeField={onChangeField} />
      <ParamSlider field="qtcValue" label="QTC Value" value={params.qtcValue} maxValue={255} onChangeField={onChangeField} />
      <ParamSlider field="breakingBytes" label="Breaking Bytes" value={params.breakingBytes} maxValue={64} onChangeField={onChangeField} />
      <ParamSlider field="maxRandom" label="Max Random" value={params.maxRandom} minValue={1} maxValue={255} onChangeField={onChangeField} />
      <p className={styles.sectionTitle}>stage</p>
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
      <div className={styles.seedRow}>
        <ParamSlider field="seed" label="Seed" value={params.seed} maxValue={9999} onChangeField={onChangeField} />
        <Button className={styles.seedButton} onPress={onRandomizeSeed} aria-label="シードをランダム化">
          ↻
        </Button>
      </div>
    </aside>
  );
};
