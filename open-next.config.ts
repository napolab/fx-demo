import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Static-only (SSG) deployment: no ISR / on-demand revalidation, so no
// incremental cache override is needed. Pages are generated at build time and
// served as static assets by the Worker.
export default defineCloudflareConfig({});
