import type { CollectionConfig } from 'payload';

export const Media = {
  slug: 'media',
  labels: { singular: 'メディア', plural: 'メディア' },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      label: '代替テキスト',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // crop / focalPoint rely on sharp, which is not available on Workers yet.
    crop: false,
    focalPoint: false,
  },
} satisfies CollectionConfig;
