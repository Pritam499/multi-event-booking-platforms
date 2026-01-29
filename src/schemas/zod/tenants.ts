import { z } from 'zod';

export const tenantDataSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const tenantSchema = tenantDataSchema.extend({
  id: z.union([z.string(), z.number()]),
  createdAt: z.string(),
  updatedAt: z.string(),
});