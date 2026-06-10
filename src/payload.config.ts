import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { r2Storage } from '@payloadcms/storage-r2';
import { type CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare';
import { buildConfig } from 'payload';
import type { GetPlatformProxyOptions } from 'wrangler';

import { Media } from './collections/media';
import { Users } from './collections/users';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const realpath = (value: string): string | undefined => (fs.existsSync(value) ? fs.realpathSync(value) : undefined);
const isCLI = process.argv.some((value) => realpath(value)?.endsWith(path.join('payload', 'bin.js')) ?? false);
const isProduction = process.env.NODE_ENV === 'production';

// Adapted from @opennextjs/cloudflare's cloudflare-context helper. During the
// Payload CLI and local dev we resolve bindings through wrangler's platform proxy
// (which loads `.dev.vars`); at runtime on Workers we use the live context.
const getCloudflareContextFromWrangler = async (): Promise<CloudflareContext> => {
  const wrangler = (await import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`)) as {
    getPlatformProxy: (options: GetPlatformProxyOptions) => Promise<CloudflareContext>;
  };

  // Remote bindings (live D1/R2) are only needed when explicitly deploying or
  // running migrations against production. Plain `next build` and local dev use
  // local bindings so they never require Cloudflare account selection.
  const useRemoteBindings = process.env.USE_REMOTE_BINDINGS === 'true';

  return wrangler.getPlatformProxy({
    environment: process.env.CLOUDFLARE_ENV,
    remoteBindings: useRemoteBindings,
  } satisfies GetPlatformProxyOptions);
};

const cloudflare = isCLI || !isProduction ? await getCloudflareContextFromWrangler() : await getCloudflareContext({ async: true });

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    livePreview: {
      url: () => process.env.BASE_URL ?? 'http://localhost:3000',
      collections: [],
    },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: cloudflare.env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({
    binding: cloudflare.env.D1,
    migrationDir: path.resolve(dirname, '..', 'migrations'),
  }),
  plugins: [
    r2Storage({
      bucket: cloudflare.env.R2,
      collections: { media: true },
    }),
  ],
});
