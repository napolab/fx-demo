// Framework-free WebGPU extraction engine for PolyTrace. Owns the device, the
// camera-frame texture and the downsample compute pipeline; per call it uploads one
// video frame, runs the WGSL pass and reads back the coarse colour map once.

import extractShader from './shaders/extract.wgsl';

export type ExtractResult = {
  colors: Uint8Array;
};

export type PolyTraceEngine = {
  extract: (video: HTMLVideoElement) => Promise<ExtractResult | undefined>;
  dispose: () => void;
};

type EngineState = {
  disposed: boolean;
  busy: boolean;
  texture: GPUTexture | undefined;
  bindGroup: GPUBindGroup | undefined;
};

const WORKGROUP_SIZE = 8;

export const createPolyTraceEngine = async (cols: number, rows: number): Promise<PolyTraceEngine | undefined> => {
  if (navigator.gpu === undefined) return undefined;
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter === null) return undefined;
  const device = await adapter.requestDevice();

  const colorsBytes = cols * rows * 4;

  const colorsBuffer = device.createBuffer({ size: colorsBytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const stagingBuffer = device.createBuffer({ size: colorsBytes, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  const paramsBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(paramsBuffer, 0, new Uint32Array([cols, rows, 0, 0]));

  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
  const module = device.createShaderModule({ code: extractShader });
  const pipeline = device.createComputePipeline({ layout: 'auto', compute: { module, entryPoint: 'extract' } });

  const state: EngineState = { disposed: false, busy: false, texture: undefined, bindGroup: undefined };

  const ensureSourceTexture = (width: number, height: number): GPUTexture => {
    const existing = state.texture;
    if (existing !== undefined && existing.width === width && existing.height === height) return existing;

    existing?.destroy();
    const texture = device.createTexture({
      size: [width, height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    state.texture = texture;
    state.bindGroup = undefined;

    return texture;
  };

  const ensureBindGroup = (texture: GPUTexture): GPUBindGroup => {
    const existing = state.bindGroup;
    if (existing !== undefined) return existing;

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: texture.createView() },
        { binding: 1, resource: sampler },
        { binding: 2, resource: { buffer: paramsBuffer } },
        { binding: 3, resource: { buffer: colorsBuffer } },
      ],
    });
    state.bindGroup = bindGroup;

    return bindGroup;
  };

  const extract = async (video: HTMLVideoElement): Promise<ExtractResult | undefined> => {
    if (state.disposed || state.busy) return undefined;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return undefined;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) return undefined;

    state.busy = true;
    try {
      const texture = ensureSourceTexture(width, height);
      device.queue.copyExternalImageToTexture({ source: video }, { texture }, [width, height]);

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, ensureBindGroup(texture));
      pass.dispatchWorkgroups(Math.ceil(cols / WORKGROUP_SIZE), Math.ceil(rows / WORKGROUP_SIZE));
      pass.end();
      encoder.copyBufferToBuffer(colorsBuffer, 0, stagingBuffer, 0, colorsBytes);
      device.queue.submit([encoder.finish()]);

      await stagingBuffer.mapAsync(GPUMapMode.READ);
      if (state.disposed) return undefined;
      const mapped = stagingBuffer.getMappedRange();
      const colors = new Uint8Array(mapped.slice(0, colorsBytes));
      stagingBuffer.unmap();

      return { colors };
    } catch {
      return undefined;
    } finally {
      state.busy = false;
    }
  };

  const dispose = (): void => {
    if (state.disposed) return;
    state.disposed = true;
    state.texture?.destroy();
    colorsBuffer.destroy();
    stagingBuffer.destroy();
    paramsBuffer.destroy();
    device.destroy();
  };

  return { extract, dispose };
};
