// Processing-grid resolution for the glitch pipeline. One processed texel maps to
// (blockSize / 8) canvas pixels, so an 8-texel DCT block covers blockSize pixels.

import type { BlockSize } from '../../types';

const MAX_LONG_EDGE = 1024;
const BLOCK = 8;

export type ProcSize = {
  width: number;
  height: number;
};

const floorToBlock = (value: number): number => Math.max(BLOCK, Math.floor(value / BLOCK) * BLOCK);

export const fitProcSize = (cssWidth: number, cssHeight: number, devicePixelRatio: number, blockSize: BlockSize): ProcSize => {
  const scale = blockSize / BLOCK;
  const rawWidth = (cssWidth * devicePixelRatio) / scale;
  const rawHeight = (cssHeight * devicePixelRatio) / scale;
  const fit = Math.min(1, MAX_LONG_EDGE / Math.max(rawWidth, rawHeight, 1));

  return {
    width: floorToBlock(rawWidth * fit),
    height: floorToBlock(rawHeight * fit),
  };
};
