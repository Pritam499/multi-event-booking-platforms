// src/collections/Bookings.ts
import type { CollectionConfig } from 'payload';
import { bookingBeforeChange, bookingAfterChange } from '../hooks/bookingHooks';

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  admin: { useAsTitle: 'id' },
  fields: [
    { name: 'event', type: 'relationship', relationTo: 'events', required: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Canceled', value: 'canceled' },
      ],
      required: true,
      defaultValue: 'waitlisted',
    },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [bookingBeforeChange],
    afterChange: [bookingAfterChange],
  },
  access: {
    create: ({ req }) => !!req.user,
    read: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => !!req.user,
  },
};
