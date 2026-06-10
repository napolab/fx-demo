// Pipeline construction with auto layouts; bind groups are derived per pipeline.

import { shaderSources } from './shader-sources';

export type Pipelines = {
  colorSeparate: GPUComputePipeline;
  dctCorrupt: GPUComputePipeline;
  render: GPURenderPipeline;
};

const computePipeline = (device: GPUDevice, code: string, label: string): GPUComputePipeline =>
  device.createComputePipeline({ label, layout: 'auto', compute: { module: device.createShaderModule({ label, code }), entryPoint: 'main' } });

export const createPipelines = (device: GPUDevice, canvasFormat: GPUTextureFormat): Pipelines => {
  const renderModule = device.createShaderModule({ label: 'render', code: shaderSources.render });

  return {
    colorSeparate: computePipeline(device, shaderSources.colorSeparate, 'color-separate'),
    dctCorrupt: computePipeline(device, shaderSources.dctCorrupt, 'dct-corrupt'),
    render: device.createRenderPipeline({
      label: 'render',
      layout: 'auto',
      vertex: { module: renderModule, entryPoint: 'vs_main' },
      fragment: { module: renderModule, entryPoint: 'fs_main', targets: [{ format: canvasFormat }] },
      primitive: { topology: 'triangle-list' },
    }),
  };
};
