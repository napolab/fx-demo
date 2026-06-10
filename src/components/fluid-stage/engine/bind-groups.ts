// Static bind groups for the fixed ping-pong protocol. Per frame the velocity is
// written exactly four times (advect -> splat -> vorticity -> project), so it always
// ends the frame in velocity0; dye ends in dye0; pressure ends in pressure0 after the
// decay + 35 Jacobi iterations (odd write count). That stability is what lets every
// bind group be created once per resize instead of per frame.

import type { FieldSet } from './resources';
import type { Pipelines } from './pipelines';

export type UniformBuffers = {
  simParams: GPUBuffer;
  splats: GPUBuffer;
};

export type BindGroups = {
  advectVelocity: GPUBindGroup;
  splatVelocity: GPUBindGroup;
  curl: GPUBindGroup;
  vorticity: GPUBindGroup;
  divergence: GPUBindGroup;
  pressureDecay: GPUBindGroup;
  pressureJacobiEven: GPUBindGroup;
  pressureJacobiOdd: GPUBindGroup;
  gradientSubtract: GPUBindGroup;
  advectDyeForward: GPUBindGroup;
  advectDyeBackward: GPUBindGroup;
  maccormackCombine: GPUBindGroup;
  injectDye: GPUBindGroup;
  // The offset field flips parity once per frame (single write), so the advect
  // pass and the render pass that reads its output each need two variants.
  advectOffsetEven: GPUBindGroup;
  advectOffsetOdd: GPUBindGroup;
  renderEven: GPUBindGroup;
  renderOdd: GPUBindGroup;
};

export type BindGroupContext = {
  device: GPUDevice;
  pipelines: Pipelines;
  fields: FieldSet;
  buffers: UniformBuffers;
  sampler: GPUSampler;
  cameraView: GPUTextureView;
};

const group = (device: GPUDevice, pipeline: GPUComputePipeline | GPURenderPipeline, resources: readonly GPUBindingResource[]): GPUBindGroup =>
  device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: resources.map((resource, binding) => ({ binding, resource })),
  });

export const createBindGroups = (context: BindGroupContext): BindGroups => {
  const { device, pipelines, fields, buffers, sampler, cameraView } = context;
  const params: GPUBindingResource = { buffer: buffers.simParams };
  const splats: GPUBindingResource = { buffer: buffers.splats };

  return {
    advectVelocity: group(device, pipelines.advectVelocity, [params, sampler, fields.velocity0.view, fields.velocity1.view]),
    splatVelocity: group(device, pipelines.splatVelocity, [params, splats, fields.velocity1.view, fields.velocity0.view]),
    curl: group(device, pipelines.curl, [params, fields.velocity0.view, fields.curl.view]),
    vorticity: group(device, pipelines.vorticity, [params, fields.velocity0.view, fields.curl.view, fields.velocity1.view]),
    divergence: group(device, pipelines.divergence, [params, fields.velocity1.view, fields.divergence.view]),
    pressureDecay: group(device, pipelines.pressureDecay, [params, fields.pressure0.view, fields.pressure1.view]),
    pressureJacobiEven: group(device, pipelines.pressureJacobi, [params, fields.pressure1.view, fields.divergence.view, fields.pressure0.view]),
    pressureJacobiOdd: group(device, pipelines.pressureJacobi, [params, fields.pressure0.view, fields.divergence.view, fields.pressure1.view]),
    gradientSubtract: group(device, pipelines.gradientSubtract, [params, fields.pressure0.view, fields.velocity1.view, fields.velocity0.view]),
    advectDyeForward: group(device, pipelines.advectDyeForward, [params, sampler, fields.velocity0.view, fields.dye0.view, fields.scratch0.view]),
    advectDyeBackward: group(device, pipelines.advectDyeBackward, [params, sampler, fields.velocity0.view, fields.scratch0.view, fields.scratch1.view]),
    maccormackCombine: group(device, pipelines.maccormackCombine, [params, sampler, fields.velocity0.view, fields.dye0.view, fields.scratch0.view, fields.scratch1.view, fields.dye1.view]),
    injectDye: group(device, pipelines.injectDye, [params, splats, sampler, fields.dye1.view, cameraView, fields.dye0.view]),
    advectOffsetEven: group(device, pipelines.advectOffset, [params, sampler, fields.velocity0.view, fields.offset0.view, fields.offset1.view]),
    advectOffsetOdd: group(device, pipelines.advectOffset, [params, sampler, fields.velocity0.view, fields.offset1.view, fields.offset0.view]),
    renderEven: group(device, pipelines.render, [params, sampler, fields.dye0.view, fields.velocity0.view, fields.curl.view, fields.offset1.view, cameraView]),
    renderOdd: group(device, pipelines.render, [params, sampler, fields.dye0.view, fields.velocity0.view, fields.curl.view, fields.offset0.view, cameraView]),
  };
};
