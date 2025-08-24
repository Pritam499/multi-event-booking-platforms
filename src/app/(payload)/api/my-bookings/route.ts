// src/app/(payload)/api/my-bookings/route.ts
import { NextResponse } from 'next/server';
import payload from 'payload';
import { getUserFromAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getUserFromAuth(request);

    // Fetch all bookings for the logged-in user
    const bookings = await payload.find({
      collection: 'bookings',
      where: { user: { equals: user.id } },
      sort: '-createdAt',
      depth: 2,
    });

    return NextResponse.json(bookings.docs);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Internal error' },
      { status: 500 }
    );
  }
}
