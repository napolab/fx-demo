// Framework-free WebGPU JPEG-glitch engine. Owns device, context, textures,
// pipelines and bind groups; the session layer feeds FrameInput once per frame.

import { GLITCH_UNIFORM_FLOAT_COUNT, normalizeParams, packGlitchUniforms } from '../math/glitch-params';
import { fitProcSize } from '../math/proc-size';
import { scaledQuantTables } from '../math/quant-table';
import type { BlockSize, FrameInput } from '../types';
import { createBindGroups, type BindGroups } from './bind-groups';
import { createPipelines, type Pipelines } from './pipelines';
import { createCameraTexture, createLinearSampler, createNearestSampler, createQuantBuffer, createUniformBuffer, createYCbCrTexture, type FieldTexture } from './resources';

export type GlitchEngine = {
  frame: (input: FrameInput) => void;
  resize: (cssWidth: number, cssHeight: number, devicePixelRatio: number) => void;
  updateCamera: (video: HTMLVideoElement) => void;
  lost: Promise<GPUDeviceLostInfo>;
  destroy: () => void;
};

const MAX_DPR = 2;
const BLOCK = 8;

type EngineState = {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
  blockSize: BlockSize;
  lastQuality: number;
  camera: FieldTexture;
  ycbcrRaw: FieldTexture;
  ycbcrGlitched: FieldTexture;
  bindGroups: BindGroups;
  camAspect: number;
};

type GPUHandles = {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
};

const acquireGPU = async (canvas: HTMLCanvasElement): Promise<GPUHandles | undefined> => {
  const gpu = navigator.gpu;
  if (gpu === undefined) return undefined;
  const adapter = await gpu.requestAdapter();
  if (adapter === null) return undefined;
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (context === null) return undefined;
  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  return { device, context, format };
};

export const createGlitchEngine = async (canvas: HTMLCanvasElement): Promise<GlitchEngine | undefined> => {
  const handles = await acquireGPU(canvas);
  if (handles === undefined) return undefined;
  const { device, context, format } = handles;

  const pipelines: Pipelines = createPipelines(device, format);
  const uniformBuffer = createUniformBuffer(device, GLITCH_UNIFORM_FLOAT_COUNT * 4);
  const quantBuffer = createQuantBuffer(device);
  const linearSampler = createLinearSampler(device);
  const nearestSampler = createNearestSampler(device);

  const buildBindGroups = (camera: FieldTexture, ycbcrRaw: FieldTexture, ycbcrGlitched: FieldTexture): BindGroups =>
    createBindGroups(device, pipelines, { uniformBuffer, quantBuffer, camera, ycbcrRaw, ycbcrGlitched, linearSampler, nearestSampler });

  const initialProc = fitProcSize(canvas.clientWidth || 640, canvas.clientHeight || 360, 1, 16);
  const initialCamera = createCameraTexture(device, 2, 2);
  const initialRaw = createYCbCrTexture(device, initialProc.width, initialProc.height, 'ycbcr-raw');
  const initialGlitched = createYCbCrTexture(device, initialProc.width, initialProc.height, 'ycbcr-glitched');

  const state: EngineState = {
    cssWidth: canvas.clientWidth || 640,
    cssHeight: canvas.clientHeight || 360,
    dpr: 1,
    blockSize: 16,
    lastQuality: -1,
    camera: initialCamera,
    ycbcrRaw: initialRaw,
    ycbcrGlitched: initialGlitched,
    bindGroups: buildBindGroups(initialCamera, initialRaw, initialGlitched),
    camAspect: 16 / 9,
  };

  const rebuildProcTextures = (): void => {
    const proc = fitProcSize(state.cssWidth, state.cssHeight, state.dpr, state.blockSize);
    state.ycbcrRaw.texture.destroy();
    state.ycbcrGlitched.texture.destroy();
    state.ycbcrRaw = createYCbCrTexture(device, proc.width, proc.height, 'ycbcr-raw');
    state.ycbcrGlitched = createYCbCrTexture(device, proc.width, proc.height, 'ycbcr-glitched');
    state.bindGroups = buildBindGroups(state.camera, state.ycbcrRaw, state.ycbcrGlitched);
  };

  const ensureQuantTables = (quality: number): void => {
    if (quality === state.lastQuality) return;
    state.lastQuality = quality;
    device.queue.writeBuffer(quantBuffer, 0, scaledQuantTables(quality));
  };

  const writeUniforms = (input: FrameInput): void => {
    const normalized = normalizeParams(input);
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      packGlitchUniforms({
        procWidth: state.ycbcrRaw.width,
        procHeight: state.ycbcrRaw.height,
        amount: normalized.amount,
        chroma: normalized.chroma,
        shift: normalized.shift,
        seed: normalized.seed,
        camAspect: state.camAspect,
        canvasAspect: state.cssWidth / Math.max(1, state.cssHeight),
        cameraReady: input.cameraReady ? 1 : 0,
      }),
    );
  };

  const encode = (): void => {
    const encoder = device.createCommandEncoder();
    const compute = encoder.beginComputePass();
    compute.setPipeline(pipelines.colorSeparate);
    compute.setBindGroup(0, state.bindGroups.colorSeparate);
    compute.dispatchWorkgroups(Math.ceil(state.ycbcrRaw.width / BLOCK), Math.ceil(state.ycbcrRaw.height / BLOCK));
    compute.setPipeline(pipelines.dctCorrupt);
    compute.setBindGroup(0, state.bindGroups.dctCorrupt);
    compute.dispatchWorkgroups(state.ycbcrRaw.width / BLOCK, state.ycbcrRaw.height / BLOCK);
    compute.end();

    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
    });
    pass.setPipeline(pipelines.render);
    pass.setBindGroup(0, state.bindGroups.render);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  };

  const updateCameraTexture = (video: HTMLVideoElement): void => {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) return;
    if (width !== state.camera.width || height !== state.camera.height) {
      state.camera.texture.destroy();
      state.camera = createCameraTexture(device, width, height);
      state.camAspect = width / height;
      state.bindGroups = buildBindGroups(state.camera, state.ycbcrRaw, state.ycbcrGlitched);
    }
    device.queue.copyExternalImageToTexture({ source: video }, { texture: state.camera.texture }, { width, height });
  };

  return {
    frame: (input) => {
      if (input.blockSize !== state.blockSize) {
        state.blockSize = input.blockSize;
        rebuildProcTextures();
      }
      ensureQuantTables(input.quality);
      writeUniforms(input);
      encode();
    },
    resize: (cssWidth, cssHeight, devicePixelRatio) => {
      const dpr = Math.min(devicePixelRatio, MAX_DPR);
      state.cssWidth = Math.max(1, cssWidth);
      state.cssHeight = Math.max(1, cssHeight);
      state.dpr = dpr;
      const element = canvas;
      element.width = Math.round(state.cssWidth * dpr);
      element.height = Math.round(state.cssHeight * dpr);
      rebuildProcTextures();
    },
    updateCamera: updateCameraTexture,
    lost: device.lost,
    destroy: () => {
      state.camera.texture.destroy();
      state.ycbcrRaw.texture.destroy();
      state.ycbcrGlitched.texture.destroy();
      device.destroy();
    },
  };
};
