// src/app/(payload)/api/cancel-booking/route.ts
import { NextResponse } from 'next/server';
import payload from 'payload';
import { getUserFromAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId required' }, { status: 400 });
    }

    const user = await getUserFromAuth(request);

    // Load booking to ensure it belongs to the user or tenant
    const booking = await payload.findByID({
      collection: 'bookings',
      id: String(bookingId),
      depth: 0,
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Attendee can cancel only their own booking
    if (user.role === 'attendee' && booking.user !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update booking to canceled (hooks handle notifications & waitlist promotion)
    const updated = await payload.update({
      collection: 'bookings',
      id: bookingId,
      data: { status: 'canceled' },
      req: { user } as any,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Internal error' },
      { status: 500 }
    );
  }
}
