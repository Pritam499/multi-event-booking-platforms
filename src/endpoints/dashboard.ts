import type { PayloadRequest } from 'payload'
import type { Response } from 'express'
import payload from 'payload'

function relToId(rel: any) {
  if (!rel) return null
  if (typeof rel === 'string') return rel
  if (typeof rel === 'object') return rel.id ?? rel._id ?? null
  return null
}

export default async function dashboard(req: PayloadRequest, res: Response) {
  try {
    const { user } = req
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (!['organizer', 'admin'].includes((user as any).role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const tenantId = relToId((user as any).tenant)
    const now = new Date().toISOString()

    // Upcoming events for tenant
    const events = await payload.find({
      collection: 'events',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { date: { greater_than: now } },
        ],
      },
      depth: 0,
    })

    // All bookings for tenant
    const bookings = await payload.find({
      collection: 'bookings',
      where: {
        tenant: { equals: tenantId },
      },
      depth: 0,
    })

    const totalEvents = events.totalDocs ?? 0
    const totalConfirmed = bookings.docs.filter((b: any) => b.status === 'confirmed').length
    const totalWaitlisted = bookings.docs.filter((b: any) => b.status === 'waitlisted').length
    const totalCanceled = bookings.docs.filter((b: any) => b.status === 'canceled').length

    const eventsWithStats = events.docs.map((ev: any) => {
      const evId = relToId(ev.id ?? ev._id)
      const eventBookings = bookings.docs.filter((b: any) => relToId(b.event) === evId)
      const confirmedCount = eventBookings.filter((b: any) => b.status === 'confirmed').length
      const waitlistedCount = eventBookings.filter((b: any) => b.status === 'waitlisted').length
      const canceledCount = eventBookings.filter((b: any) => b.status === 'canceled').length
      const capacity = Number(ev.capacity) || 0
      const percentageFilled = capacity > 0 ? Math.round((confirmedCount / capacity) * 100) : 0

      return {
        id: ev.id ?? ev._id,
        title: ev.title,
        date: ev.date,
        capacity,
        confirmedCount,
        waitlistedCount,
        canceledCount,
        percentageFilled,
      }
    })

    const recentActivity = await payload.find({
      collection: 'bookingLogs',
      where: {
        tenant: { equals: tenantId },
      },
      sort: '-createdAt',
      limit: 5,
      depth: 1,
    })

    return res.status(200).json({
      events: eventsWithStats,
      summary: {
        totalEvents,
        totalConfirmed,
        totalWaitlisted,
        totalCanceled,
      },
      recentActivity: recentActivity.docs,
    })
  } catch (err) {
    payload.logger.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
