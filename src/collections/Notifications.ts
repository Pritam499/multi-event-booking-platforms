// collections/Notifications.ts
import type { CollectionConfig } from 'payload';

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true },
    { name: 'booking', type: 'relationship', relationTo: 'bookings' },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Booking Confirmed', value: 'booking_confirmed' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Waitlist Promoted', value: 'waitlist_promoted' },
        { label: 'Booking Canceled', value: 'booking_canceled' },
      ],
      required: true,
    },
    { name: 'title', type: 'text' },
    { name: 'message', type: 'textarea' },
    { name: 'read', type: 'checkbox', defaultValue: false },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true },
  ],
  timestamps: true,
};
