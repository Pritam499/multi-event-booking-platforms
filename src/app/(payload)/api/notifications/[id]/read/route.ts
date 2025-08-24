// src/app/(payload)/api/read-notification/[id]/route.ts
import { NextResponse } from 'next/server';
import payload from 'payload';
import { getUserFromAuth } from '@/lib/auth';

// Use this signature for Next.js 15 route handlers
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // params is now a Promise
) {
  try {
    const resolvedParams = await params; // Await the params
    const { id } = resolvedParams;
    
    const user = await getUserFromAuth(request);

    const notif = await payload.findByID({
      collection: 'notifications',
      id,
      depth: 0,
    });
    
    if (!notif) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notif.user !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await payload.update({
      collection: 'notifications',
      id,
      data: { read: true },
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
