import { z } from 'zod';

export const bookingDataSchema = z.object({
  event: z.union([z.string(), z.number()]),
  user: z.union([z.string(), z.number()]),
  status: z.enum(['confirmed', 'waitlisted', 'canceled']),
  tenant: z.union([z.string(), z.number()]),
});

export const bookingSchema = bookingDataSchema.extend({
  id: z.union([z.string(), z.number()]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// API input schemas
export const bookEventSchema = z.object({
  eventId: z.union([z.string(), z.number()]),
});

export const cancelBookingSchema = z.object({
  bookingId: z.union([z.string(), z.number()]),
});