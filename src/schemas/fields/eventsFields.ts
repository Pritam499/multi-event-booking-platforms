import { Field } from 'payload';
import { COLLECTIONS } from '@/constants/collections';

export const eventsFields: Field[] = [
  { name: "title", type: "text", required: true },
  { name: "description", type: "richText" },
  { name: "date", type: "date", required: true },
  { name: "capacity", type: "number", required: true, defaultValue: 1 },
  {
    name: "organizer",
    type: "relationship",
    relationTo: COLLECTIONS.USERS,
  },
  {
    name: "tenant",
    type: "relationship",
    relationTo: COLLECTIONS.TENANTS,
    required: true,
  },
];