import { z } from 'zod';

export const userRoleSchema = z.enum(['attendee', 'organizer', 'admin', 'superAdmin']);

export const userDataSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: userRoleSchema,
  tenant: z.union([z.string(), z.number()]).optional(),
});

export const userSchema = userDataSchema.extend({
  id: z.union([z.string(), z.number()]),
  createdAt: z.string(),
  updatedAt: z.string(),
});