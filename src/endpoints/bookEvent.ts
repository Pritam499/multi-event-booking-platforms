import type { PayloadRequest } from 'payload'
import type { Response } from 'express'
import payload from 'payload'

function relToId(rel: any) {
  if (!rel) return null
  if (typeof rel === 'string') return rel
  if (typeof rel === 'object') return rel.id ?? rel._id ?? null
  return null
}

export default async function bookEvent(req: PayloadRequest, res: Response) {
  try {
    const { eventId } = req.body as { eventId?: string }
    const { user } = req

    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (!eventId) return res.status(400).json({ error: 'eventId is required' })

    // Load event
    const event = await payload.findByID({
      collection: 'events',
      id: eventId,
      depth: 0,
    })

    if (!event) return res.status(404).json({ error: 'Event not found' })

    // Tenant check
    const eventTenant = relToId((event as any).tenant)
    const userTenant = relToId((user as any).tenant)
    if (eventTenant !== userTenant) {
      return res.status(403).json({ error: 'Event belongs to another tenant' })
    }

    // Prevent duplicate booking
    const existing = await payload.find({
      collection: 'bookings',
      where: {
        and: [
          { event: { equals: eventId } },
          { user: { equals: (user as any).id } },
        ],
      },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      return res.status(400).json({ error: 'You already have a booking for this event' })
    }

    // Count confirmed bookings for this event
    const confirmed = await payload.find({
      collection: 'bookings',
      where: {
        and: [
          { event: { equals: eventId } },
          { status: { equals: 'confirmed' } },
        ],
      },
      depth: 0,
    })

    const capacity = Number((event as any).capacity) || 0
    const confirmedCount = confirmed.totalDocs ?? confirmed.docs?.length ?? 0

    const status = confirmedCount >= capacity ? 'waitlisted' : 'confirmed'

    // Create booking (server-side — set user and tenant from authenticated user)
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        event: eventId,
        user: (user as any).id,
        status,
        tenant: userTenant,
      },
    })

    // Create notification
    const notificationType = status === 'confirmed' ? 'booking_confirmed' : 'waitlisted'
    await payload.create({
      collection: 'notifications',
      data: {
        user: (user as any).id,
        booking: (booking as any).id,
        type: notificationType,
        title: status === 'confirmed' ? 'Booking Confirmed' : 'Added to Waitlist',
        message:
          status === 'confirmed'
            ? `Your booking for ${(event as any).title} is confirmed.`
            : `Your booking for ${(event as any).title} is on the waitlist.`,
        tenant: userTenant,
      },
    })

    // Create booking log
    await payload.create({
      collection: 'bookingLogs',
      data: {
        booking: (booking as any).id,
        event: eventId,
        user: (user as any).id,
        action: status === 'confirmed' ? 'auto_confirm' : 'auto_waitlist',
        note: `Booking ${status} automatically`,
        tenant: userTenant,
      },
    })

    return res.status(200).json(booking)
  } catch (err) {
    payload.logger.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
