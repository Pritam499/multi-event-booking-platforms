import { z } from 'zod';

export const notificationTypeSchema = z.enum(['booking_confirmed', 'waitlisted', 'waitlist_promoted', 'booking_canceled']);

export const notificationDataSchema = z.object({
  user: z.union([z.string(), z.number()]),
  booking: z.union([z.string(), z.number()]).optional(),
  type: notificationTypeSchema,
  title: z.string().optional(),
  message: z.string().optional(),
  read: z.boolean(),
  tenant: z.union([z.string(), z.number()]),
});

export const notificationSchema = notificationDataSchema.extend({
  id: z.union([z.string(), z.number()]),
  createdAt: z.string(),
  updatedAt: z.string(),
});