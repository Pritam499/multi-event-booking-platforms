import { Field } from 'payload';

export const tenantsFields: Field[] = [
  { name: "name", type: "text", required: true },
  { name: "slug", type: "text", required: true, unique: true },
];