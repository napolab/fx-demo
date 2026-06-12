'use client';

// Bottom scrubber for a loaded video file: play/pause, seek slider and time.
// Hidden for the live webcam (the parent only renders it for file sources).

import { useCallback } from 'react';
import { Button, Slider, SliderThumb, SliderTrack } from 'react-aria-components';

import { formatTime } from '../../format-time';

import * as styles from './styles.css';

type SeekbarProps = {
  currentTime: number;
  duration: number;
  paused: boolean;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
};

export const Seekbar = ({ currentTime, duration, paused, onSeek, onTogglePlay }: SeekbarProps) => {
  const handleChange = useCallback(
    (value: number | number[]) => {
      if (typeof value === 'number') onSeek(value);
    },
    [onSeek],
  );

  return (
    <div className={styles.root}>
      <Button className={styles.playButton} onPress={onTogglePlay} aria-label={paused ? '再生' : '一時停止'}>
        {paused ? '▶' : '⏸'}
      </Button>
      <Slider className={styles.slider} value={Math.min(currentTime, duration)} minValue={0} maxValue={Math.max(duration, 0.1)} step={0.05} onChange={handleChange} aria-label="再生位置">
        <SliderTrack className={styles.track}>
          <SliderThumb className={styles.thumb} />
        </SliderTrack>
      </Slider>
      <span className={styles.time}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
};
