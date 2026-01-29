import { z } from 'zod';

export const bookingLogActionSchema = z.enum(['create_request', 'auto_waitlist', 'auto_confirm', 'promote_from_waitlist', 'cancel_confirmed']);

export const bookingLogDataSchema = z.object({
  booking: z.union([z.string(), z.number()]).optional(),
  event: z.union([z.string(), z.number()]).optional(),
  user: z.union([z.string(), z.number()]).optional(),
  action: bookingLogActionSchema,
  note: z.string().optional(),
  tenant: z.union([z.string(), z.number()]),
});

export const bookingLogSchema = bookingLogDataSchema.extend({
  id: z.union([z.string(), z.number()]),
  createdAt: z.string(),
  updatedAt: z.string(),
});