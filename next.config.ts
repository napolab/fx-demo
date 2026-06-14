import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Serialize page-data collection / static generation. The FX routes (jpeg-glitch,
  // bounding-mask, ...) pull in heavy deps (MediaPipe + p5 + WebGPU) and, run in
  // parallel build workers, exhaust memory — a worker dies and the parent fails with
  // "Unexpected end of JSON input". One worker keeps the build reliable.
  experimental: { workerThreads: false, cpus: 1 },
  // Packages with Cloudflare Workers (workerd) specific code.
  // https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: ['jose', 'pg-cloudflare'],
  // WGSL shaders are imported as raw source strings (see src/types/shaders.d.ts).
  webpack: (config, { webpack }) => ({
    ...config,
    module: {
      ...config.module,
      rules: [...config.module.rules, { test: /\.wgsl$/, type: 'asset/source' }],
    },
    plugins: [
      ...config.plugins,
      // p5 guards a dev-only `require('../../translations/dev')` (a file absent from
      // the npm package) behind `typeof P5_DEV_BUILD !== 'undefined'`. Webpack tolerates
      // the unresolved require in the dead branch, but OpenNext's esbuild pass resolves
      // it statically and fails. Pin the typeof so the branch is dead-code-eliminated
      // before the server bundle reaches OpenNext.
      new webpack.DefinePlugin({ 'typeof P5_DEV_BUILD': JSON.stringify('undefined') }),
    ],
  }),
};

export default nextConfig;

// Required for OpenNext local development bindings (getCloudflareContext during `next dev`).
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

void initOpenNextCloudflareForDev();
