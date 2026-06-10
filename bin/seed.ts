import { getPayload } from 'payload';

import config from '@payload-config';

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

  await payload.create({
    collection: 'users',
    data: {
      email: 'admin@example.com',
      password: 'change-me-please',
    },
  });

  payload.logger.info('Seed complete: created initial admin user (admin@example.com).');
};

await seed();
