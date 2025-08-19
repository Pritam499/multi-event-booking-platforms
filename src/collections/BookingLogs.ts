// collections/BookingLogs.ts
import type { CollectionConfig } from 'payload';

export const BookingLogs: CollectionConfig = {
  slug: 'booking-logs',
  fields: [
    { name: 'booking', type: 'relationship', relationTo: 'bookings' },
    { name: 'event', type: 'relationship', relationTo: 'events' },
    { name: 'user', type: 'relationship', relationTo: 'users' },
    {
      name: 'action',
      type: 'select',
      options: [
        { label: 'Create Request', value: 'create_request' },
        { label: 'Auto Waitlist', value: 'auto_waitlist' },
        { label: 'Auto Confirm', value: 'auto_confirm' },
        { label: 'Promote From Waitlist', value: 'promote_from_waitlist' },
        { label: 'Cancel Confirmed', value: 'cancel_confirmed' },
      ],
    },
    { name: 'note', type: 'text' },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true },
  ],
  timestamps: true,
};
