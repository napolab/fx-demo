// GPU resource constructors. YCbCr planes are rgba16float (storage + sampled);
// the camera texture matches the video's native size for copyExternalImageToTexture.

export type FieldTexture = {
  texture: GPUTexture;
  view: GPUTextureView;
  width: number;
  height: number;
};

const createField = (device: GPUDevice, width: number, height: number, format: GPUTextureFormat, usage: number, label: string): FieldTexture => {
  const texture = device.createTexture({ label, size: { width, height }, format, usage });

  return { texture, view: texture.createView(), width, height };
};

export const createYCbCrTexture = (device: GPUDevice, width: number, height: number, label: string): FieldTexture =>
  createField(device, width, height, 'rgba16float', GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING, label);

export const createCameraTexture = (device: GPUDevice, width: number, height: number): FieldTexture =>
  createField(device, width, height, 'rgba8unorm', GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT, 'camera');

export const createLinearSampler = (device: GPUDevice): GPUSampler =>
  device.createSampler({ label: 'linear-sampler', magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });

// repeat on U: the render pass wraps shifted rows with fract(), repeat keeps
// edge texels from smearing across the seam.
export const createNearestSampler = (device: GPUDevice): GPUSampler =>
  device.createSampler({ label: 'nearest-sampler', magFilter: 'nearest', minFilter: 'nearest', addressModeU: 'repeat', addressModeV: 'clamp-to-edge' });

export const createUniformBuffer = (device: GPUDevice, byteLength: number): GPUBuffer =>
  device.createBuffer({ label: 'glitch-params', size: byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

export const createQuantBuffer = (device: GPUDevice): GPUBuffer => device.createBuffer({ label: 'quant-tables', size: 128 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
