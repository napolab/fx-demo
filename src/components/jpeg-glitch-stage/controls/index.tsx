'use client';

// AE Effect Controls-style parameter panel mirroring the aescripts JPEG glitch
// plugin: Compression ratio / Broken bytes (count + stream window + seed) /
// per-table quantization groups (QTC chroma, QTL luma) / Advanced settings
// toggles. Each control reports through (field, value) callbacks so the stage
// owns the params object.

import { useCallback } from 'react';
import { Checkbox, Label, Radio, RadioGroup, Slider, SliderOutput, SliderThumb, SliderTrack } from 'react-aria-components';

import * as styles from './styles.css';
import type { BlockSize, GlitchParams } from '../types';

export type NumericField =
  | 'compression'
  | 'brokenBytes'
  | 'glitchStart'
  | 'glitchEnd'
  | 'brokenSeed'
  | 'qtcPosition'
  | 'qtcValue'
  | 'qtcBreakingBytes'
  | 'qtcMaxRandom'
  | 'qtcSeed'
  | 'qtlPosition'
  | 'qtlValue'
  | 'qtlBreakingBytes'
  | 'qtlMaxRandom'
  | 'qtlSeed'
  | 'chroma';

export type BooleanField = 'qtcEnabled' | 'qtlEnabled' | 'inverseDCT' | 'ycbcrToRGB';

export type GlitchControlsProps = {
  params: GlitchParams;
  onChangeField: (field: NumericField, value: number) => void;
  onToggleField: (field: BooleanField, value: boolean) => void;
  onChangeBlockSize: (value: BlockSize) => void;
};

type ParamSliderProps = {
  field: NumericField;
  label: string;
  accessibleLabel?: string;
  value: number;
  minValue?: number;
  maxValue: number;
  onChangeField: (field: NumericField, value: number) => void;
};

const ParamSlider = ({ field, label, accessibleLabel, value, minValue = 0, maxValue, onChangeField }: ParamSliderProps) => {
  const handleChange = useCallback(
    (next: number | number[]) => {
      if (typeof next === 'number') onChangeField(field, next);
    },
    [field, onChangeField],
  );

  // A visible <Label> overrides aria-label for the thumb's accessible name, so
  // when groups need distinct names (e.g. three "Seed" sliders) the visible
  // text becomes a plain span and the unique name rides on aria-label.
  return (
    <Slider className={styles.slider} aria-label={accessibleLabel} value={value} minValue={minValue} maxValue={maxValue} step={1} onChange={handleChange}>
      <div className={styles.sliderHeader}>
        {accessibleLabel === undefined ? <Label className={styles.sliderLabel}>{label}</Label> : <span className={styles.sliderLabel}>{label}</span>}
        <SliderOutput className={styles.sliderValue} />
      </div>
      <SliderTrack className={styles.sliderTrack}>
        <SliderThumb className={styles.sliderThumb} />
      </SliderTrack>
    </Slider>
  );
};

type ParamToggleProps = {
  field: BooleanField;
  label: string;
  value: boolean;
  onToggleField: (field: BooleanField, value: boolean) => void;
};

const ParamToggle = ({ field, label, value, onToggleField }: ParamToggleProps) => {
  const handleChange = useCallback(
    (next: boolean) => {
      onToggleField(field, next);
    },
    [field, onToggleField],
  );

  return (
    <Checkbox className={styles.toggle} isSelected={value} onChange={handleChange}>
      <span className={styles.toggleBox} data-selected={value || undefined} aria-hidden="true" />
      {label}
    </Checkbox>
  );
};

type TableGroupProps = {
  prefix: 'qtc' | 'qtl';
  title: string;
  toggleLabel: string;
  enabled: boolean;
  position: number;
  value: number;
  breakingBytes: number;
  maxRandom: number;
  seed: number;
  onChangeField: (field: NumericField, value: number) => void;
  onToggleField: (field: BooleanField, value: boolean) => void;
};

const TableGroup = ({ prefix, title, toggleLabel, enabled, position, value, breakingBytes, maxRandom, seed, onChangeField, onToggleField }: TableGroupProps) => (
  <>
    <p className={styles.sectionTitle}>{title}</p>
    <ParamToggle field={`${prefix}Enabled`} label={toggleLabel} value={enabled} onToggleField={onToggleField} />
    <ParamSlider field={`${prefix}Position`} label="Position" accessibleLabel={`${toggleLabel} Position`} value={position} minValue={1} maxValue={64} onChangeField={onChangeField} />
    <ParamSlider field={`${prefix}Value`} label="Value" accessibleLabel={`${toggleLabel} Value`} value={value} maxValue={255} onChangeField={onChangeField} />
    <ParamSlider field={`${prefix}BreakingBytes`} label="Breaking Bytes" accessibleLabel={`${toggleLabel} Breaking Bytes`} value={breakingBytes} maxValue={64} onChangeField={onChangeField} />
    <ParamSlider field={`${prefix}MaxRandom`} label="Max Random Value" accessibleLabel={`${toggleLabel} Max Random Value`} value={maxRandom} maxValue={255} onChangeField={onChangeField} />
    <ParamSlider field={`${prefix}Seed`} label="Seed" accessibleLabel={`${toggleLabel} Seed`} value={seed} maxValue={9999} onChangeField={onChangeField} />
  </>
);

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

export const GlitchControls = ({ params, onChangeField, onToggleField, onChangeBlockSize }: GlitchControlsProps) => {
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
      <ParamSlider field="compression" label="Compression Ratio" value={params.compression} minValue={1} maxValue={100} onChangeField={onChangeField} />
      <p className={styles.sectionTitle}>broken bytes</p>
      <ParamSlider field="brokenBytes" label="Broken Bytes" value={params.brokenBytes} maxValue={4096} onChangeField={onChangeField} />
      <ParamSlider field="glitchStart" label="Start of Glitch" value={params.glitchStart} maxValue={100} onChangeField={onChangeField} />
      <ParamSlider field="glitchEnd" label="End of Glitch" value={params.glitchEnd} maxValue={100} onChangeField={onChangeField} />
      <ParamSlider field="brokenSeed" label="Seed" accessibleLabel="Broken Bytes Seed" value={params.brokenSeed} maxValue={9999} onChangeField={onChangeField} />
      <TableGroup
        prefix="qtc"
        title="quantization tables for chroma"
        toggleLabel="QTC"
        enabled={params.qtcEnabled}
        position={params.qtcPosition}
        value={params.qtcValue}
        breakingBytes={params.qtcBreakingBytes}
        maxRandom={params.qtcMaxRandom}
        seed={params.qtcSeed}
        onChangeField={onChangeField}
        onToggleField={onToggleField}
      />
      <TableGroup
        prefix="qtl"
        title="quantization tables for luma"
        toggleLabel="QTL"
        enabled={params.qtlEnabled}
        position={params.qtlPosition}
        value={params.qtlValue}
        breakingBytes={params.qtlBreakingBytes}
        maxRandom={params.qtlMaxRandom}
        seed={params.qtlSeed}
        onChangeField={onChangeField}
        onToggleField={onToggleField}
      />
      <p className={styles.sectionTitle}>advanced settings</p>
      <ParamToggle field="inverseDCT" label="Inverse DCT" value={params.inverseDCT} onToggleField={onToggleField} />
      <ParamToggle field="ycbcrToRGB" label="YCbCr To RGB" value={params.ycbcrToRGB} onToggleField={onToggleField} />
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
    </aside>
  );
};
