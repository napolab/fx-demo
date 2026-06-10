import type { CollectionConfig } from 'payload';

export const Users = {
  slug: 'users',
  labels: { singular: 'ユーザー', plural: 'ユーザー' },
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    // Email and password are added by default via `auth: true`.
  ],
  versions: false,
} satisfies CollectionConfig;
