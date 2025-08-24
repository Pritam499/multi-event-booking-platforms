import { NextResponse } from 'next/server';
import payload from 'payload';
import { getUserFromAuth } from '@/lib/auth'; 

export async function GET(request: Request) {
  try {
    const user = await getUserFromAuth(request);
    if (user.role !== 'organizer' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = user.tenant;

    // Get events
    const events = await payload.find({
      collection: 'events',
      where: { tenant: { equals: tenantId } },
      depth: 1,
      sort: 'date',
    });

    const eventStats = await Promise.all(
      events.docs.map(async (ev) => {
        const confirmed = await payload.count({
          collection: 'bookings',
          where: { and: [{ event: { equals: ev.id } }, { status: { equals: 'confirmed' } }] },
        });
        const waitlisted = await payload.count({
          collection: 'bookings',
          where: { and: [{ event: { equals: ev.id } }, { status: { equals: 'waitlisted' } }] },
        });
        const canceled = await payload.count({
          collection: 'bookings',
          where: { and: [{ event: { equals: ev.id } }, { status: { equals: 'canceled' } }] },
        });
        const percentageFilled = ev.capacity
          ? Math.round((confirmed.totalDocs / ev.capacity) * 100)
          : 0;

        return {
          id: ev.id,
          title: ev.title,
          date: ev.date,
          capacity: ev.capacity,
          confirmed: confirmed.totalDocs,
          waitlisted: waitlisted.totalDocs,
          canceled: canceled.totalDocs,
          percentageFilled,
        };
      })
    );

    // Summary analytics
    const summary = {
      totalEvents: events.totalDocs,
      totalConfirmed: eventStats.reduce((a, e) => a + e.confirmed, 0),
      totalWaitlisted: eventStats.reduce((a, e) => a + e.waitlisted, 0),
      totalCanceled: eventStats.reduce((a, e) => a + e.canceled, 0),
    };

    // Recent activity
    const recentLogs = await payload.find({
      collection: 'booking-logs',
      where: { tenant: { equals: tenantId } },
      sort: '-createdAt',
      limit: 5,
      depth: 2,
    });

    return NextResponse.json({
      events: eventStats,
      summary,
      recentActivity: recentLogs.docs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}