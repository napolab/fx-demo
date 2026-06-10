// Framework-free WebGPU engine for the trace stage. Two fullscreen passes:
// feedback (mask → decaying trail, fixed content-space resolution) and
// composite (camera + mask + trail → graded canvas image). The session feeds
// one TraceFrameInput per RAF; textures arrive via updateCamera/updateMask.

import type { TraceFrameInput } from '../types';
import compositeSource from './shaders/composite.wgsl';
import feedbackSource from './shaders/feedback.wgsl';
import fullscreenSource from './shaders/fullscreen.wgsl';

export type TraceEngine = {
  frame: (input: TraceFrameInput) => void;
  resize: (cssWidth: number, cssHeight: number, devicePixelRatio: number) => void;
  updateCamera: (video: HTMLVideoElement) => void;
  updateMask: (mask: Uint8Array<ArrayBuffer>, width: number, height: number) => void;
  lost: Promise<GPUDeviceLostInfo>;
  destroy: () => void;
};

const TRAIL_WIDTH = 640;
const TRAIL_HEIGHT = 360;
const MAX_DPR = 2;
const TRAIL_DECAY = 0.94;
// coverScale(vec2) + resolution(vec2) + time + cameraReady + decay + pad = 8 floats.
const PARAMS_FLOAT_COUNT = 8;

type EngineTextures = {
  camera: GPUTexture;
  mask: GPUTexture;
  trailA: GPUTexture;
  trailB: GPUTexture;
};

type EngineState = {
  textures: EngineTextures;
  feedbackGroups: GPUBindGroup[];
  compositeGroups: GPUBindGroup[];
  parity: number;
  dirty: boolean;
  destroyed: boolean;
};

const createTexture = (device: GPUDevice, width: number, height: number, format: GPUTextureFormat, usage: number): GPUTexture => device.createTexture({ size: { width, height }, format, usage });

const sampledCopyUsage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST;
const sampledRenderUsage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT;
const cameraUsage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT;

export const createTraceEngine = async (canvas: HTMLCanvasElement): Promise<TraceEngine | undefined> => {
  if (navigator.gpu === undefined) return undefined;
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter === null) return undefined;
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (context === null) {
    device.destroy();
    return undefined;
  }
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  const feedbackModule = device.createShaderModule({ code: `${fullscreenSource}\n${feedbackSource}` });
  const compositeModule = device.createShaderModule({ code: `${fullscreenSource}\n${compositeSource}` });
  const feedbackPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: feedbackModule, entryPoint: 'vsMain' },
    fragment: { module: feedbackModule, entryPoint: 'fsMain', targets: [{ format: 'r16float' }] },
    primitive: { topology: 'triangle-list' },
  });
  const compositePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: compositeModule, entryPoint: 'vsMain' },
    fragment: { module: compositeModule, entryPoint: 'fsMain', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });

  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  const uniformBuffer = device.createBuffer({ size: PARAMS_FLOAT_COUNT * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const uniformData = new Float32Array(PARAMS_FLOAT_COUNT);

  const state: EngineState = {
    textures: {
      camera: createTexture(device, 1, 1, 'rgba8unorm', cameraUsage),
      mask: createTexture(device, 1, 1, 'r8unorm', sampledCopyUsage),
      trailA: createTexture(device, TRAIL_WIDTH, TRAIL_HEIGHT, 'r16float', sampledRenderUsage),
      trailB: createTexture(device, TRAIL_WIDTH, TRAIL_HEIGHT, 'r16float', sampledRenderUsage),
    } satisfies EngineTextures,
    feedbackGroups: [],
    compositeGroups: [],
    parity: 0,
    dirty: true,
    destroyed: false,
  };

  const rebuildBindGroups = (): void => {
    const { camera, mask, trailA, trailB } = state.textures;
    const feedbackEntries = (read: GPUTexture): GPUBindGroupEntry[] => [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: sampler },
      { binding: 2, resource: mask.createView() },
      { binding: 3, resource: read.createView() },
    ];
    const compositeEntries = (read: GPUTexture): GPUBindGroupEntry[] => [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: sampler },
      { binding: 2, resource: camera.createView() },
      { binding: 3, resource: mask.createView() },
      { binding: 4, resource: read.createView() },
    ];
    state.feedbackGroups = [
      device.createBindGroup({ layout: feedbackPipeline.getBindGroupLayout(0), entries: feedbackEntries(trailB) }),
      device.createBindGroup({ layout: feedbackPipeline.getBindGroupLayout(0), entries: feedbackEntries(trailA) }),
    ];
    state.compositeGroups = [
      device.createBindGroup({ layout: compositePipeline.getBindGroupLayout(0), entries: compositeEntries(trailA) }),
      device.createBindGroup({ layout: compositePipeline.getBindGroupLayout(0), entries: compositeEntries(trailB) }),
    ];
    state.dirty = false;
  };

  const runPass = (encoder: GPUCommandEncoder, pipeline: GPURenderPipeline, bindGroup: GPUBindGroup, view: GPUTextureView): void => {
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
  };

  return {
    frame(input) {
      if (state.destroyed) return;
      if (state.dirty) rebuildBindGroups();
      uniformData.set([input.coverScale.x, input.coverScale.y, canvas.width, canvas.height, input.timeSeconds, input.cameraReady, TRAIL_DECAY, 0]);
      device.queue.writeBuffer(uniformBuffer, 0, uniformData);

      const writeTrail = state.parity === 0 ? state.textures.trailA : state.textures.trailB;
      const feedbackGroup = state.feedbackGroups[state.parity];
      const compositeGroup = state.compositeGroups[state.parity];
      if (feedbackGroup === undefined || compositeGroup === undefined) return;

      const encoder = device.createCommandEncoder();
      runPass(encoder, feedbackPipeline, feedbackGroup, writeTrail.createView());
      runPass(encoder, compositePipeline, compositeGroup, context.getCurrentTexture().createView());
      device.queue.submit([encoder.finish()]);
      state.parity = 1 - state.parity;
    },
    resize(cssWidth, cssHeight, devicePixelRatio) {
      const target = canvas;
      const dpr = Math.min(devicePixelRatio, MAX_DPR);
      target.width = Math.max(1, Math.floor(cssWidth * dpr));
      target.height = Math.max(1, Math.floor(cssHeight * dpr));
    },
    updateCamera(video) {
      if (video.videoWidth === 0 || state.destroyed) return;
      if (state.textures.camera.width !== video.videoWidth || state.textures.camera.height !== video.videoHeight) {
        state.textures.camera.destroy();
        state.textures.camera = createTexture(device, video.videoWidth, video.videoHeight, 'rgba8unorm', cameraUsage);
        state.dirty = true;
      }
      device.queue.copyExternalImageToTexture({ source: video }, { texture: state.textures.camera }, { width: video.videoWidth, height: video.videoHeight });
    },
    updateMask(mask, width, height) {
      if (state.destroyed) return;
      if (state.textures.mask.width !== width || state.textures.mask.height !== height) {
        state.textures.mask.destroy();
        state.textures.mask = createTexture(device, width, height, 'r8unorm', sampledCopyUsage);
        state.dirty = true;
      }
      device.queue.writeTexture({ texture: state.textures.mask }, mask, { bytesPerRow: width }, { width, height });
    },
    lost: device.lost,
    destroy() {
      state.destroyed = true;
      device.destroy();
    },
  };
};
