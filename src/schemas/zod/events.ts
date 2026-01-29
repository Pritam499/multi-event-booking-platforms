import { z } from 'zod';

export const eventDataSchema = z.object({
  title: z.string().min(1),
  description: z.any().optional(), // RichText
  date: z.string(), // ISO date
  capacity: z.number().min(1),
  organizer: z.union([z.string(), z.number()]).optional(),
  tenant: z.union([z.string(), z.number()]),
});

export const eventSchema = eventDataSchema.extend({
  id: z.union([z.string(), z.number()]),
  createdAt: z.string(),
  updatedAt: z.string(),
});