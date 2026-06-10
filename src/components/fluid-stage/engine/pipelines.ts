// Pipeline creation. All pipelines use auto layouts; bind groups are built per
// resource set in bind-groups.ts.

import { shaderSources } from './shader-sources';

export type Pipelines = {
  advectVelocity: GPUComputePipeline;
  splatVelocity: GPUComputePipeline;
  curl: GPUComputePipeline;
  vorticity: GPUComputePipeline;
  divergence: GPUComputePipeline;
  pressureDecay: GPUComputePipeline;
  pressureJacobi: GPUComputePipeline;
  gradientSubtract: GPUComputePipeline;
  advectOffset: GPUComputePipeline;
  advectDyeForward: GPUComputePipeline;
  advectDyeBackward: GPUComputePipeline;
  maccormackCombine: GPUComputePipeline;
  injectDye: GPUComputePipeline;
  render: GPURenderPipeline;
};

const createComputePipeline = (device: GPUDevice, label: string, code: string): GPUComputePipeline =>
  device.createComputePipeline({
    label,
    layout: 'auto',
    compute: { module: device.createShaderModule({ label, code }), entryPoint: 'main' },
  });

const createRenderPipeline = (device: GPUDevice, format: GPUTextureFormat): GPURenderPipeline => {
  const module = device.createShaderModule({ label: 'render', code: shaderSources.render });

  return device.createRenderPipeline({
    label: 'render',
    layout: 'auto',
    vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });
};

export const createPipelines = (device: GPUDevice, format: GPUTextureFormat): Pipelines => ({
  advectVelocity: createComputePipeline(device, 'advect-velocity', shaderSources.advectVelocity),
  splatVelocity: createComputePipeline(device, 'splat-velocity', shaderSources.splatVelocity),
  curl: createComputePipeline(device, 'curl', shaderSources.curl),
  vorticity: createComputePipeline(device, 'vorticity', shaderSources.vorticity),
  divergence: createComputePipeline(device, 'divergence', shaderSources.divergence),
  pressureDecay: createComputePipeline(device, 'pressure-decay', shaderSources.pressureDecay),
  pressureJacobi: createComputePipeline(device, 'pressure-jacobi', shaderSources.pressureJacobi),
  gradientSubtract: createComputePipeline(device, 'gradient-subtract', shaderSources.gradientSubtract),
  advectOffset: createComputePipeline(device, 'advect-offset', shaderSources.advectOffset),
  advectDyeForward: createComputePipeline(device, 'advect-dye-forward', shaderSources.advectDyeForward),
  advectDyeBackward: createComputePipeline(device, 'advect-dye-backward', shaderSources.advectDyeBackward),
  maccormackCombine: createComputePipeline(device, 'maccormack-combine', shaderSources.maccormackCombine),
  injectDye: createComputePipeline(device, 'inject-dye', shaderSources.injectDye),
  render: createRenderPipeline(device, format),
});
