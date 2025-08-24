import { NextResponse } from 'next/server';
import payload from 'payload';
import { getUserFromAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getUserFromAuth(request);

    const notifications = await payload.find({
      collection: 'notifications',
      where: {
        and: [
          { user: { equals: user.id } },
          { read: { equals: false } },
        ],
      },
      sort: '-createdAt',
      depth: 2,
    });

    return NextResponse.json(notifications.docs);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}
