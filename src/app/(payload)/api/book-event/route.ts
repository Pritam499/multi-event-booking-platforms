// src/app/(payload)/api/book-event/route.ts
import { NextResponse } from 'next/server';
import payload from 'payload';
import { getUserFromAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    // ✅ use shared auth helper
    const user = await getUserFromAuth(request);

    // Optional: validate event exists
    const ev = await payload.findByID({
      collection: 'events',
      id: String(eventId),
      depth: 0,
    });
    if (!ev) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Minimal req object for Payload hooks (they expect req.user)
    const reqForPayload = { user } as any;

    // Create booking — hooks will attach user/tenant/status automatically
    const booking = await payload.create({
      collection: 'bookings',
      data: { event: eventId } as any,
      req: reqForPayload,
    });

    return NextResponse.json(booking);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Internal error' },
      { status: 500 }
    );
  }
}
