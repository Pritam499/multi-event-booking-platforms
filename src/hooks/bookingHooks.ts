// src/hooks/bookingHooks.ts
import type { CollectionBeforeChangeHook, CollectionAfterChangeHook } from 'payload';
import type { Booking } from '../payload-types';

// ----- BEFORE CHANGE -----
export const bookingBeforeChange: CollectionBeforeChangeHook<Booking> = async ({
  req,
  operation,
  data,
}) => {
  if (operation !== 'create') return data;

  const user = req.user as any;
  if (!user?.tenant) throw new Error('User must belong to a tenant');

  data.tenant = user.tenant;

  const eventId = data.event;
  if (!eventId) throw new Error('Event is required');

  const confirmedResult = await req.payload.find({
    collection: 'bookings',
    where: {
      event: { equals: eventId },
      status: { equals: 'confirmed' },
      tenant: { equals: String(user.tenant) },
    },
    depth: 0,
  });

  const ev = await req.payload.findByID({
    collection: 'events',
    id: String(eventId),
    depth: 0,
  });

  const capacity = ev?.capacity || 0;
  const confirmedCount = confirmedResult.totalDocs ?? 0;

  data.status = confirmedCount < capacity ? 'confirmed' : 'waitlisted';
  data.user = user.id;

  return data;
};

// ----- AFTER CHANGE -----
export const bookingAfterChange: CollectionAfterChangeHook<Booking> = async ({
  req,
  doc,
  operation,
}) => {
  if (operation !== 'create') return;

  await req.payload.create({
    collection: 'notifications',
    data: {
      user: doc.user,
      booking: doc.id,
      type: doc.status === 'confirmed' ? 'booking_confirmed' : 'waitlisted',
      title: doc.status === 'confirmed' ? 'Booking Confirmed' : 'Added to Waitlist',
      message:
        doc.status === 'confirmed'
          ? `Your booking for event ${doc.event} is confirmed.`
          : `The event is full. You've been added to the waitlist.`,
      tenant: doc.tenant,
    },
  });

  await req.payload.create({
    collection: 'booking-logs',
    data: {
      booking: doc.id,
      event: doc.event,
      user: doc.user,
      action: doc.status === 'confirmed' ? 'auto_confirm' : 'auto_waitlist',
      note: `Booking created with status ${doc.status}`,
      tenant: doc.tenant,
    },
  });
};
