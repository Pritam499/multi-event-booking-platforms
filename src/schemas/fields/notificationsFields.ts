import { Field } from 'payload';
import { COLLECTIONS } from '@/constants/collections';

export const notificationsFields: Field[] = [
  {
    name: "user",
    type: "relationship",
    relationTo: COLLECTIONS.USERS,
    required: true,
  },
  {
    name: "booking",
    type: "relationship",
    relationTo: COLLECTIONS.BOOKINGS,
    required: false,
  },
  {
    name: "type",
    type: "select",
    options: [
      { label: "Booking Confirmed", value: "booking_confirmed" },
      { label: "Waitlisted", value: "waitlisted" },
      { label: "Waitlist Promoted", value: "waitlist_promoted" },
      { label: "Booking Canceled", value: "booking_canceled" },
    ],
    required: true,
  },
  { name: "title", type: "text" },
  { name: "message", type: "textarea" },
  { name: "read", type: "checkbox", defaultValue: false },
  {
    name: "tenant",
    type: "relationship",
    relationTo: COLLECTIONS.TENANTS,
    required: true,
  },
];