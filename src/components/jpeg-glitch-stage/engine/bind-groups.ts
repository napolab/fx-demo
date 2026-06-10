// Bind groups are rebuilt whenever a texture is recreated (resize / block-size
// change / camera dimension change); buffers and samplers are stable.

import type { Pipelines } from './pipelines';
import type { FieldTexture } from './resources';

export type BindGroups = {
  colorSeparate: GPUBindGroup;
  dctCorrupt: GPUBindGroup;
  render: GPUBindGroup;
};

export type BindGroupInputs = {
  uniformBuffer: GPUBuffer;
  quantBuffer: GPUBuffer;
  camera: FieldTexture;
  ycbcrRaw: FieldTexture;
  ycbcrGlitched: FieldTexture;
  linearSampler: GPUSampler;
  nearestSampler: GPUSampler;
};

export const createBindGroups = (device: GPUDevice, pipelines: Pipelines, inputs: BindGroupInputs): BindGroups => ({
  colorSeparate: device.createBindGroup({
    label: 'color-separate',
    layout: pipelines.colorSeparate.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputs.uniformBuffer } },
      { binding: 1, resource: inputs.camera.view },
      { binding: 2, resource: inputs.linearSampler },
      { binding: 3, resource: inputs.ycbcrRaw.view },
    ],
  }),
  dctCorrupt: device.createBindGroup({
    label: 'dct-corrupt',
    layout: pipelines.dctCorrupt.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputs.uniformBuffer } },
      { binding: 1, resource: inputs.ycbcrRaw.view },
      { binding: 2, resource: inputs.ycbcrGlitched.view },
      { binding: 3, resource: { buffer: inputs.quantBuffer } },
    ],
  }),
  render: device.createBindGroup({
    label: 'render',
    layout: pipelines.render.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputs.uniformBuffer } },
      { binding: 1, resource: inputs.ycbcrGlitched.view },
      { binding: 2, resource: inputs.nearestSampler },
    ],
  }),
});
