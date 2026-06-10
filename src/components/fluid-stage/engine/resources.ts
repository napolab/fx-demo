// GPU resource creation: field textures (all rgba16float so storage writes stay
// within WebGPU core formats), the camera texture, samplers and uniform buffers.

export type FieldTexture = {
  texture: GPUTexture;
  view: GPUTextureView;
};

export const createField = (device: GPUDevice, width: number, height: number, label: string): FieldTexture => {
  const texture = device.createTexture({
    label,
    size: { width, height },
    format: 'rgba16float',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
  });

  return { texture, view: texture.createView() };
};

// copyExternalImageToTexture requires COPY_DST + RENDER_ATTACHMENT.
// The -srgb format decodes the video into linear space on sampling.
export const createCameraTexture = (device: GPUDevice, width: number, height: number): FieldTexture => {
  const texture = device.createTexture({
    label: 'camera',
    size: { width, height },
    format: 'rgba8unorm-srgb',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });

  return { texture, view: texture.createView() };
};

export const createLinearSampler = (device: GPUDevice): GPUSampler =>
  device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  });

export const createUniformBuffer = (device: GPUDevice, byteLength: number, label: string): GPUBuffer =>
  device.createBuffer({
    label,
    size: byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

export type FieldSet = {
  velocity0: FieldTexture;
  velocity1: FieldTexture;
  dye0: FieldTexture;
  dye1: FieldTexture;
  scratch0: FieldTexture;
  scratch1: FieldTexture;
  pressure0: FieldTexture;
  pressure1: FieldTexture;
  offset0: FieldTexture;
  offset1: FieldTexture;
  divergence: FieldTexture;
  curl: FieldTexture;
};

export type FieldSizes = {
  sim: { width: number; height: number };
  dye: { width: number; height: number };
};

export const createFieldSet = (device: GPUDevice, sizes: FieldSizes): FieldSet => ({
  velocity0: createField(device, sizes.sim.width, sizes.sim.height, 'velocity0'),
  velocity1: createField(device, sizes.sim.width, sizes.sim.height, 'velocity1'),
  dye0: createField(device, sizes.dye.width, sizes.dye.height, 'dye0'),
  dye1: createField(device, sizes.dye.width, sizes.dye.height, 'dye1'),
  scratch0: createField(device, sizes.dye.width, sizes.dye.height, 'scratch0'),
  scratch1: createField(device, sizes.dye.width, sizes.dye.height, 'scratch1'),
  pressure0: createField(device, sizes.sim.width, sizes.sim.height, 'pressure0'),
  pressure1: createField(device, sizes.sim.width, sizes.sim.height, 'pressure1'),
  offset0: createField(device, sizes.sim.width, sizes.sim.height, 'offset0'),
  offset1: createField(device, sizes.sim.width, sizes.sim.height, 'offset1'),
  divergence: createField(device, sizes.sim.width, sizes.sim.height, 'divergence'),
  curl: createField(device, sizes.sim.width, sizes.sim.height, 'curl'),
});

export const destroyFieldSet = (fields: FieldSet): void => {
  for (const field of Object.values(fields)) {
    field.texture.destroy();
  }
};
