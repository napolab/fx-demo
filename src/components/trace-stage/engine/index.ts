// Framework-free WebGPU engine for the trace stage: a single fullscreen
// composite pass that cover-fits the camera into the viewport and grades it
// into a dim monochrome stage (scanlines, grain, vignette). All line work —
// contours, wires, bboxes, HUD — is drawn by the p5 overlay above this canvas.
// The session feeds one TraceFrameInput per RAF; the camera arrives as a
// texture via updateCamera.

import type { TraceFrameInput } from '../types';
import compositeSource from './shaders/composite.wgsl';
import fullscreenSource from './shaders/fullscreen.wgsl';

export type TraceEngine = {
  frame: (input: TraceFrameInput) => void;
  resize: (cssWidth: number, cssHeight: number, devicePixelRatio: number) => void;
  updateCamera: (video: HTMLVideoElement) => void;
  lost: Promise<GPUDeviceLostInfo>;
  destroy: () => void;
};

const MAX_DPR = 2;
// coverScale(vec2) + resolution(vec2) + time + cameraReady + 2 pads = 8 floats.
const PARAMS_FLOAT_COUNT = 8;

type EngineState = {
  camera: GPUTexture;
  bindGroup: GPUBindGroup | undefined;
  destroyed: boolean;
};

const createTexture = (device: GPUDevice, width: number, height: number, format: GPUTextureFormat, usage: number): GPUTexture => device.createTexture({ size: { width, height }, format, usage });

export const createTraceEngine = async (canvas: HTMLCanvasElement): Promise<TraceEngine | undefined> => {
  if (navigator.gpu === undefined) return undefined;
  // GPUTextureUsage only exists in WebGPU-capable browsers; referencing it at
  // module scope crashes Next.js server rendering of this client component.
  const cameraUsage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT;
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

  const compositeModule = device.createShaderModule({ code: `${fullscreenSource}\n${compositeSource}` });
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
    camera: createTexture(device, 1, 1, 'rgba8unorm', cameraUsage),
    bindGroup: undefined,
    destroyed: false,
  };

  const rebuildBindGroup = (): void => {
    state.bindGroup = device.createBindGroup({
      layout: compositePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: sampler },
        { binding: 2, resource: state.camera.createView() },
      ],
    });
  };
  rebuildBindGroup();

  return {
    frame(input) {
      if (state.destroyed || state.bindGroup === undefined) return;
      uniformData.set([input.coverScale.x, input.coverScale.y, canvas.width, canvas.height, input.timeSeconds, input.cameraReady, 0, 0]);
      device.queue.writeBuffer(uniformBuffer, 0, uniformData);

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      });
      pass.setPipeline(compositePipeline);
      pass.setBindGroup(0, state.bindGroup);
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
    },
    resize(cssWidth, cssHeight, devicePixelRatio) {
      const target = canvas;
      const dpr = Math.min(devicePixelRatio, MAX_DPR);
      target.width = Math.max(1, Math.floor(cssWidth * dpr));
      target.height = Math.max(1, Math.floor(cssHeight * dpr));
    },
    updateCamera(video) {
      if (video.videoWidth === 0 || state.destroyed) return;
      if (state.camera.width !== video.videoWidth || state.camera.height !== video.videoHeight) {
        state.camera.destroy();
        state.camera = createTexture(device, video.videoWidth, video.videoHeight, 'rgba8unorm', cameraUsage);
        rebuildBindGroup();
      }
      device.queue.copyExternalImageToTexture({ source: video }, { texture: state.camera }, { width: video.videoWidth, height: video.videoHeight });
    },
    lost: device.lost,
    destroy() {
      state.destroyed = true;
      device.destroy();
    },
  };
};
