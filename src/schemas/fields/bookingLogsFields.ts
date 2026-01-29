import { Field } from 'payload';
import { COLLECTIONS } from '@/constants/collections';

export const bookingLogsFields: Field[] = [
  { name: "booking", type: "relationship", relationTo: COLLECTIONS.BOOKINGS },
  { name: "event", type: "relationship", relationTo: COLLECTIONS.EVENTS },
  { name: "user", type: "relationship", relationTo: COLLECTIONS.USERS },
  {
    name: "action",
    type: "select",
    options: [
      { label: "Create Request", value: "create_request" },
      { label: "Auto Waitlist", value: "auto_waitlist" },
      { label: "Auto Confirm", value: "auto_confirm" },
      { label: "Promote From Waitlist", value: "promote_from_waitlist" },
      { label: "Cancel Confirmed", value: "cancel_confirmed" },
    ],
    required: true,
  },
  { name: "note", type: "text" },
  {
    name: "tenant",
    type: "relationship",
    relationTo: COLLECTIONS.TENANTS,
    required: true,
  },
];