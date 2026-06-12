'use client';

// Mask controls for the bounding-mask stage, built on react-aria-components.
// Live onChange callbacks patch the params object the session reads each frame.

import { useCallback } from 'react';
import {
  Button,
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
  ColorThumb,
  Dialog,
  DialogTrigger,
  FileTrigger,
  Label,
  Popover,
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  parseColor,
  type Color,
  type Key,
} from 'react-aria-components';

import type { BodyPart } from '../../trace-stage/types';
import { formatTime } from '../format-time';
import { ALL_PARTS, PRESET_COLORS, type MaskParams, type MaskShape } from '../types';

import * as styles from './styles.css';

const PART_LABEL: Record<BodyPart, string> = {
  face: '顔',
  hand_L: '左手',
  hand_R: '右手',
  hip: '腰',
  leg_L: '左脚',
  leg_R: '右脚',
};

type PartSwitchProps = {
  part: BodyPart;
  isSelected: boolean;
  onToggle: (part: BodyPart, isSelected: boolean) => void;
};

const PartSwitch = ({ part, isSelected, onToggle }: PartSwitchProps) => {
  const handleChange = useCallback((next: boolean) => onToggle(part, next), [part, onToggle]);

  return (
    <Switch className={styles.switchRoot} isSelected={isSelected} onChange={handleChange}>
      <span className={styles.switchIndicator} />
      {PART_LABEL[part]}
    </Switch>
  );
};

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

type BoundingMaskControlsProps = {
  params: MaskParams;
  onChange: (patch: Partial<MaskParams>) => void;
  onSelectVideo: (files: FileList | null) => void;
  onRetryCamera: () => void;
  isRecording: boolean;
  recordingMs: number;
  onToggleRecording: () => void;
};

export const BoundingMaskControls = ({ params, onChange, onSelectVideo, onRetryCamera, isRecording, recordingMs, onToggleRecording }: BoundingMaskControlsProps) => {
  const handleShape = useCallback(
    (keys: Set<Key>) => {
      const [shape] = [...keys];
      if (shape === 'box' || shape === 'silhouette') onChange({ shape: shape satisfies MaskShape });
    },
    [onChange],
  );
  const handleTogglePart = useCallback((part: BodyPart, isSelected: boolean) => onChange({ parts: { ...params.parts, [part]: isSelected } }), [onChange, params.parts]);
  const handleColor = useCallback((color: Color) => onChange({ color: color.toString('hex') }), [onChange]);
  const handleOpacity = useCallback((opacity: number) => onChange({ opacity }), [onChange]);
  const handleFeather = useCallback((feather: number) => onChange({ feather }), [onChange]);
  const handlePadding = useCallback((padding: number) => onChange({ padding }), [onChange]);
  const handleLabel = useCallback((showLabel: boolean) => onChange({ showLabel }), [onChange]);

  return (
    <section className={styles.root} aria-label="マスク設定">
      <h2 className={styles.heading}>マスク設定</h2>

      <div className={styles.group}>
        <span className={styles.groupLabel}>形</span>
        <ToggleButtonGroup className={styles.toggleGroup} selectionMode="single" disallowEmptySelection selectedKeys={[params.shape]} onSelectionChange={handleShape}>
          <ToggleButton className={styles.toggleButton} id="box">
            ボックス
          </ToggleButton>
          <ToggleButton className={styles.toggleButton} id="silhouette">
            シルエット
          </ToggleButton>
        </ToggleButtonGroup>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>部位</span>
        <div className={styles.partGrid}>
          {ALL_PARTS.map((part) => (
            <PartSwitch key={part} part={part} isSelected={params.parts[part]} onToggle={handleTogglePart} />
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupLabel}>色</span>
        <ColorPicker value={parseColor(params.color)} onChange={handleColor}>
          <ColorSwatchPicker className={styles.swatchPicker}>
            {PRESET_COLORS.map((hex) => (
              <ColorSwatchPickerItem key={hex} color={hex} className={styles.swatchItem}>
                <ColorSwatch className={styles.swatch} />
              </ColorSwatchPickerItem>
            ))}
          </ColorSwatchPicker>
          <DialogTrigger>
            <Button className={styles.customButton}>カスタム…</Button>
            <Popover className={styles.popover}>
              <Dialog className={styles.dialog}>
                <ColorArea className={styles.colorArea} colorSpace="hsb" xChannel="saturation" yChannel="brightness">
                  <ColorThumb className={styles.colorThumb} />
                </ColorArea>
                <ColorSlider className={styles.hueSlider} colorSpace="hsb" channel="hue">
                  <SliderTrack className={styles.hueTrack}>
                    <ColorThumb className={styles.colorThumb} />
                  </SliderTrack>
                </ColorSlider>
              </Dialog>
            </Popover>
          </DialogTrigger>
        </ColorPicker>
      </div>

      <ParamSlider label="不透明度" value={params.opacity} minValue={0} maxValue={1} step={0.01} onChange={handleOpacity} />
      <ParamSlider label="ぼかし" value={params.feather} minValue={0} maxValue={40} step={1} onChange={handleFeather} />
      <ParamSlider label="拡大" value={params.padding} minValue={1} maxValue={1.5} step={0.01} onChange={handlePadding} />

      <Switch className={styles.switchRoot} isSelected={params.showLabel} onChange={handleLabel}>
        <span className={styles.switchIndicator} />
        部位名ラベル
      </Switch>

      <div className={styles.sourceRow}>
        <FileTrigger acceptedFileTypes={['video/mp4', 'video/webm']} onSelect={onSelectVideo}>
          <Button className={styles.controlButton}>動画を読み込む</Button>
        </FileTrigger>
        <Button className={styles.controlButton} onPress={onRetryCamera}>
          webcam に戻す
        </Button>
      </div>

      <Button className={styles.recordButton} data-recording={isRecording || undefined} onPress={onToggleRecording}>
        <span className={styles.recordDot} />
        {isRecording ? `録画停止 ${formatTime(recordingMs / 1000)}` : '録画開始'}
      </Button>
    </section>
  );
};
