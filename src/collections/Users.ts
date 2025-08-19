// collections/Users.ts
import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'text', required: true, unique: true },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Attendee', value: 'attendee' },
        { label: 'Organizer', value: 'organizer' },
        { label: 'Admin', value: 'admin' },
      ],
      defaultValue: 'attendee',
      required: true,
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    },
  ],
  access: {
    read: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    create: () => true, // allow creating users (signup)
  },
  timestamps: true,
};
