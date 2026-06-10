// Compose each pass with the shared WGSL header (struct + helpers).
// Raw .wgsl imports are wired through next.config.ts (asset/source).

import colorSeparate from './shaders/color-separate.wgsl';
import common from './shaders/common.wgsl';
import dctCorrupt from './shaders/dct-corrupt.wgsl';
import render from './shaders/render.wgsl';

const compose = (body: string): string => `${common}\n${body}`;

export const shaderSources = {
  colorSeparate: compose(colorSeparate),
  dctCorrupt: compose(dctCorrupt),
  render: compose(render),
} as const;
