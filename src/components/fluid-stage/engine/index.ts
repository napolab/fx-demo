// Framework-free WebGPU stable-fluids engine. Owns the device, context, textures,
// pipelines and bind groups; the React layer only feeds FrameInput once per RAF.

import { fitResolution } from '../math';
import type { FrameInput } from '../types';
import { createBindGroups, type BindGroups, type UniformBuffers } from './bind-groups';
import { createPipelines, type Pipelines } from './pipelines';
import { createCameraTexture, createFieldSet, createLinearSampler, createUniformBuffer, destroyFieldSet, type FieldSizes, type FieldTexture } from './resources';
import { MAX_SPLATS, packSimParams, packSplats, SIM_PARAMS_FLOAT_COUNT, SPLAT_FLOAT_STRIDE } from './uniforms';

export type FluidEngine = {
  frame: (input: FrameInput) => void;
  resize: (cssWidth: number, cssHeight: number, devicePixelRatio: number) => void;
  updateCamera: (video: HTMLVideoElement) => void;
  lost: Promise<GPUDeviceLostInfo>;
  destroy: () => void;
};

const SIM_DIVISOR = 4;
const SIM_MAX_LONG_EDGE = 416;
const DYE_DIVISOR = 2;
const DYE_MAX_LONG_EDGE = 1440;
const PRESSURE_ITERATIONS = 35;
const WORKGROUP_SIZE = 8;
const MAX_DPR = 2;

const computeSizes = (width: number, height: number): FieldSizes => ({
  sim: fitResolution(width, height, SIM_DIVISOR, SIM_MAX_LONG_EDGE),
  dye: fitResolution(width, height, DYE_DIVISOR, DYE_MAX_LONG_EDGE),
});

const range = (length: number): readonly number[] => Array.from({ length }, (_, index) => index);

const dispatch = (pass: GPUComputePassEncoder, pipeline: GPUComputePipeline, bindGroup: GPUBindGroup, size: { width: number; height: number }): void => {
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(Math.ceil(size.width / WORKGROUP_SIZE), Math.ceil(size.height / WORKGROUP_SIZE));
};

// One compute pass, many dispatches: WebGPU synchronizes writes between dispatches,
// and a single pass keeps encoding overhead minimal.
const encodeSimulation = (encoder: GPUCommandEncoder, pipelines: Pipelines, bindGroups: BindGroups, sizes: FieldSizes, offsetParity: number): void => {
  const pass = encoder.beginComputePass();
  dispatch(pass, pipelines.advectVelocity, bindGroups.advectVelocity, sizes.sim);
  dispatch(pass, pipelines.splatVelocity, bindGroups.splatVelocity, sizes.sim);
  dispatch(pass, pipelines.curl, bindGroups.curl, sizes.sim);
  dispatch(pass, pipelines.vorticity, bindGroups.vorticity, sizes.sim);
  dispatch(pass, pipelines.divergence, bindGroups.divergence, sizes.sim);
  dispatch(pass, pipelines.pressureDecay, bindGroups.pressureDecay, sizes.sim);
  for (const iteration of range(PRESSURE_ITERATIONS)) {
    const bindGroup = iteration % 2 === 0 ? bindGroups.pressureJacobiEven : bindGroups.pressureJacobiOdd;
    dispatch(pass, pipelines.pressureJacobi, bindGroup, sizes.sim);
  }
  dispatch(pass, pipelines.gradientSubtract, bindGroups.gradientSubtract, sizes.sim);
  const offsetGroup = offsetParity === 0 ? bindGroups.advectOffsetEven : bindGroups.advectOffsetOdd;
  dispatch(pass, pipelines.advectOffset, offsetGroup, sizes.sim);
  dispatch(pass, pipelines.advectDyeForward, bindGroups.advectDyeForward, sizes.dye);
  dispatch(pass, pipelines.advectDyeBackward, bindGroups.advectDyeBackward, sizes.dye);
  dispatch(pass, pipelines.maccormackCombine, bindGroups.maccormackCombine, sizes.dye);
  dispatch(pass, pipelines.injectDye, bindGroups.injectDye, sizes.dye);
  pass.end();
};

const encodeRender = (encoder: GPUCommandEncoder, view: GPUTextureView, pipelines: Pipelines, bindGroups: BindGroups, offsetParity: number): void => {
  const pass = encoder.beginRenderPass({
    colorAttachments: [{ view, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
  });
  pass.setPipeline(pipelines.render);
  pass.setBindGroup(0, offsetParity === 0 ? bindGroups.renderEven : bindGroups.renderOdd);
  pass.draw(3);
  pass.end();
};

type EngineContext = {
  device: GPUDevice;
  context: GPUCanvasContext;
  canvas: HTMLCanvasElement;
  pipelines: Pipelines;
  buffers: UniformBuffers;
  sampler: GPUSampler;
};

type EngineState = {
  sizes: FieldSizes;
  // 0: current offsets live in offset0; 1: in offset1. Flips every frame.
  offsetParity: number;
  fields: ReturnType<typeof createFieldSet>;
  bindGroups: BindGroups;
  camera: FieldTexture;
  cameraSize: { width: number; height: number };
  camAspect: number;
  canvasAspect: number;
};

const buildEngine = ({ device, context, canvas, pipelines, buffers, sampler }: EngineContext): FluidEngine => {
  const sizes = computeSizes(canvas.width, canvas.height);
  const fields = createFieldSet(device, sizes);
  const camera = createCameraTexture(device, 2, 2);
  const state: EngineState = {
    sizes,
    offsetParity: 0,
    fields,
    camera,
    cameraSize: { width: 2, height: 2 },
    camAspect: 16 / 9,
    canvasAspect: canvas.width / Math.max(canvas.height, 1),
    bindGroups: createBindGroups({ device, pipelines, fields, buffers, sampler, cameraView: camera.view }),
  };

  const rebuildBindGroups = (): void => {
    state.bindGroups = createBindGroups({
      device,
      pipelines,
      fields: state.fields,
      buffers,
      sampler,
      cameraView: state.camera.view,
    });
  };

  return {
    frame(input) {
      device.queue.writeBuffer(buffers.simParams, 0, packFrameParams(input, state));
      device.queue.writeBuffer(buffers.splats, 0, packSplats(input.splats));
      const encoder = device.createCommandEncoder();
      encodeSimulation(encoder, pipelines, state.bindGroups, state.sizes, state.offsetParity);
      encodeRender(encoder, context.getCurrentTexture().createView(), pipelines, state.bindGroups, state.offsetParity);
      device.queue.submit([encoder.finish()]);
      state.offsetParity = state.offsetParity === 0 ? 1 : 0;
    },
    resize(cssWidth, cssHeight, devicePixelRatio) {
      const target = canvas;
      const width = Math.max(1, Math.floor(cssWidth * Math.min(devicePixelRatio, MAX_DPR)));
      const height = Math.max(1, Math.floor(cssHeight * Math.min(devicePixelRatio, MAX_DPR)));
      target.width = width;
      target.height = height;
      state.canvasAspect = width / height;
      destroyFieldSet(state.fields);
      state.sizes = computeSizes(width, height);
      state.fields = createFieldSet(device, state.sizes);
      state.offsetParity = 0;
      rebuildBindGroups();
    },
    updateCamera(video) {
      if (video.readyState < 2 || video.videoWidth < 1 || video.videoHeight < 1) return;
      if (video.videoWidth !== state.cameraSize.width || video.videoHeight !== state.cameraSize.height) {
        state.camera.texture.destroy();
        state.camera = createCameraTexture(device, video.videoWidth, video.videoHeight);
        state.cameraSize = { width: video.videoWidth, height: video.videoHeight };
        state.camAspect = video.videoWidth / video.videoHeight;
        rebuildBindGroups();
      }
      device.queue.copyExternalImageToTexture({ source: video }, { texture: state.camera.texture }, { width: state.cameraSize.width, height: state.cameraSize.height });
    },
    lost: device.lost,
    destroy() {
      destroyFieldSet(state.fields);
      state.camera.texture.destroy();
      device.destroy();
    },
  };
};

const packFrameParams = (input: FrameInput, state: EngineState): Float32Array<ArrayBuffer> =>
  packSimParams({
    simWidth: state.sizes.sim.width,
    simHeight: state.sizes.sim.height,
    dyeWidth: state.sizes.dye.width,
    dyeHeight: state.sizes.dye.height,
    dtSeconds: input.dtSeconds,
    timeSeconds: input.timeSeconds,
    hueShift: input.hueShift,
    cameraReady: input.cameraReady,
    gradeMode: input.gradeMode,
    splatCount: Math.min(input.splats.length, MAX_SPLATS),
    camAspect: state.camAspect,
    canvasAspect: state.canvasAspect,
  });

// Resolves to undefined when WebGPU is unavailable so the UI can fall back gracefully.
export const createFluidEngine = async (canvas: HTMLCanvasElement): Promise<FluidEngine | undefined> => {
  const gpu = navigator.gpu;
  if (gpu === undefined) return undefined;
  const adapter = await gpu.requestAdapter();
  if (adapter === null) return undefined;
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (context === null) return undefined;
  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  return buildEngine({
    device,
    context,
    canvas,
    pipelines: createPipelines(device, format),
    buffers: {
      simParams: createUniformBuffer(device, SIM_PARAMS_FLOAT_COUNT * 4, 'sim-params'),
      splats: createUniformBuffer(device, MAX_SPLATS * SPLAT_FLOAT_STRIDE * 4, 'splats'),
    },
    sampler: createLinearSampler(device),
  });
};
