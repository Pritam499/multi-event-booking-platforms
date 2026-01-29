import { Field } from 'payload';
import { COLLECTIONS } from '@/constants/collections';

export const usersFields: Field[] = [
  { name: 'name', type: 'text', required: true },
  { name: 'email', type: 'email', required: true, unique: true, index: true, admin: { position: 'sidebar' } },
  {
    name: 'role',
    type: 'select',
    options: [
      { label: 'Attendee', value: 'attendee' },
      { label: 'Organizer', value: 'organizer' },
      { label: 'Admin', value: 'admin' },
      { label: 'Super Admin', value: 'superAdmin' },
    ],
    defaultValue: 'attendee',
    required: true,
  },
  {
    name: 'tenant',
    type: 'relationship',
    relationTo: COLLECTIONS.TENANTS,
    required: false,
    admin: { condition: (data) => data?.role !== 'superAdmin' },
  },
];