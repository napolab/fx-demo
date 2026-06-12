import { randomBytes } from 'node:crypto';

import { getPayload } from 'payload';

import config from '@payload-config';

// Prefer an operator-provided password (SEED_ADMIN_PASSWORD in .dev.vars / env);
// otherwise generate a random one and log it exactly once. Never hardcode it.
const resolveAdminPassword = (): { password: string; generated: boolean } => {
  const fromEnv = process.env.SEED_ADMIN_PASSWORD;
  if (fromEnv !== undefined && fromEnv.length >= 12) return { password: fromEnv, generated: false };
  if (fromEnv !== undefined) throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters.');

  return { password: randomBytes(24).toString('base64url'), generated: true };
};

// Seed script registered as a Payload bin entry: `pnpm seed` -> `payload run bin/seed.ts`.
// `payload run` boots the Cloudflare platform proxy so bindings (D1 / R2) are available.
const seed = async (): Promise<void> => {
  const payload = await getPayload({ config });

  const existing = await payload.find({
    collection: 'users',
    limit: 1,
  });

  if (existing.totalDocs > 0) {
    payload.logger.info('Seed skipped: users already exist.');

    return;
  }

  const { password, generated } = resolveAdminPassword();
  await payload.create({
    collection: 'users',
    data: {
      email: 'admin@example.com',
      password,
    },
  });

  payload.logger.info('Seed complete: created initial admin user (admin@example.com).');
  if (generated) {
    payload.logger.info(`Generated admin password (store it now, it will not be shown again): ${password}`);
  }
};

await seed();
