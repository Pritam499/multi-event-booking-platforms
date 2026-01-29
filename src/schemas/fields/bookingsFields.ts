import { Field } from 'payload';
import { COLLECTIONS } from '@/constants/collections';

export const bookingsFields: Field[] = [
  { name: "event", type: "relationship", relationTo: COLLECTIONS.EVENTS, required: true },
  { name: "user", type: "relationship", relationTo: COLLECTIONS.USERS, required: true },
  {
    name: "status",
    type: "select",
    options: [
      { label: "Confirmed", value: "confirmed" },
      { label: "Waitlisted", value: "waitlisted" },
      { label: "Canceled", value: "canceled" },
    ],
    required: true,
    defaultValue: "waitlisted",
  },
  { name: "tenant", type: "relationship", relationTo: COLLECTIONS.TENANTS, required: true },
];