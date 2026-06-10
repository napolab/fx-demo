import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Mirror next.config.ts (asset/source): import .wgsl shaders as raw strings.
const wgslAsSource = () => ({
  name: 'wgsl-as-source',
  transform(code: string, id: string) {
    if (!id.endsWith('.wgsl')) return undefined;

    return { code: `export default ${JSON.stringify(code)};`, map: null };
  },
});

export default defineConfig({
  plugins: [react(), wgslAsSource()],
  resolve: {
    alias: {
      'styled-system': fileURLToPath(new URL('./styled-system', import.meta.url)),
    },
  },
  test: {
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/', '.next/', '.open-next/', 'styled-system/'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
});
