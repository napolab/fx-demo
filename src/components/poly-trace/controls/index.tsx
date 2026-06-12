'use client';

// AE-style effect controls for PolyTrace, built on react-aria-components.

import { useCallback } from 'react';
import { Label, Slider, SliderOutput, SliderThumb, SliderTrack, Switch } from 'react-aria-components';

import * as styles from './styles.css';

import type { PolyTraceParams } from '../types';

type ParamSliderProps = {
  label: string;
  value: number;
  minValue: number;
  maxValue: number;
  step: number;
  onChange: (value: number) => void;
};

const ParamSlider = ({ label, value, minValue, maxValue, step, onChange }: ParamSliderProps) => {
  const handleChange = useCallback(
    (next: number | number[]) => {
      if (typeof next === 'number') onChange(next);
    },
    [onChange],
  );

  return (
    <Slider className={styles.slider} value={value} minValue={minValue} maxValue={maxValue} step={step} onChange={handleChange}>
      <div className={styles.sliderHeader}>
        <Label className={styles.sliderLabel}>{label}</Label>
        <SliderOutput className={styles.sliderOutput} />
      </div>
      <SliderTrack className={styles.sliderTrack}>
        <SliderThumb className={styles.sliderThumb} />
      </SliderTrack>
    </Slider>
  );
};

type ParamSwitchProps = {
  label: string;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
};

const ParamSwitch = ({ label, isSelected, onChange }: ParamSwitchProps) => (
  <Switch className={styles.switchRoot} isSelected={isSelected} onChange={onChange}>
    <span className={styles.switchIndicator} />
    {label}
  </Switch>
);

type PolyTraceControlsProps = {
  params: PolyTraceParams;
  onChange: (patch: Partial<PolyTraceParams>) => void;
};

export const PolyTraceControls = ({ params, onChange }: PolyTraceControlsProps) => {
  const handlePointCount = useCallback((pointCount: number) => onChange({ pointCount }), [onChange]);
  const handleDisplace = useCallback((displaceAmount: number) => onChange({ displaceAmount }), [onChange]);
  const handleEvolution = useCallback((evolution: number) => onChange({ evolution }), [onChange]);
  const handleStrokeWeight = useCallback((strokeWeight: number) => onChange({ strokeWeight }), [onChange]);
  const handleWireframe = useCallback((wireframe: boolean) => onChange({ wireframe }), [onChange]);
  const handleFill = useCallback((fillEnabled: boolean) => onChange({ fillEnabled }), [onChange]);

  return (
    <section className={styles.root} aria-label="エフェクトコントロール">
      <h2 className={styles.heading}>エフェクトコントロール</h2>
      <ParamSlider label="点の数" value={params.pointCount} minValue={50} maxValue={2000} step={10} onChange={handlePointCount} />
      <ParamSlider label="ノイズ変位" value={params.displaceAmount} minValue={0} maxValue={1} step={0.01} onChange={handleDisplace} />
      <ParamSlider label="進化速度" value={params.evolution} minValue={0} maxValue={1} step={0.01} onChange={handleEvolution} />
      <ParamSlider label="線の太さ" value={params.strokeWeight} minValue={0.5} maxValue={3} step={0.1} onChange={handleStrokeWeight} />
      <div className={styles.switchRow}>
        <ParamSwitch label="ワイヤーフレーム" isSelected={params.wireframe} onChange={handleWireframe} />
        <ParamSwitch label="塗り" isSelected={params.fillEnabled} onChange={handleFill} />
      </div>
    </section>
  );
};
