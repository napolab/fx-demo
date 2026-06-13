import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Packages with Cloudflare Workers (workerd) specific code.
  // https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: ['jose', 'pg-cloudflare'],
  // WGSL shaders are imported as raw source strings (see src/types/shaders.d.ts).
  webpack: (config) => ({
    ...config,
    module: {
      ...config.module,
      rules: [...config.module.rules, { test: /\.wgsl$/, type: 'asset/source' }],
    },
  }),
};

export default nextConfig;

// Required for OpenNext local development bindings (getCloudflareContext during `next dev`).
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

void initOpenNextCloudflareForDev();
