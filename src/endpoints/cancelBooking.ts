import type { PayloadRequest } from 'payload'
import type { Response } from 'express'
import payload from 'payload'

function relToId(rel: any) {
  if (!rel) return null
  if (typeof rel === 'string') return rel
  if (typeof rel === 'object') return rel.id ?? rel._id ?? null
  return null
}

export default async function cancelBooking(req: PayloadRequest, res: Response) {
  try {
    const { bookingId } = req.body as { bookingId?: string }
    const { user } = req

    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (!bookingId) return res.status(400).json({ error: 'bookingId is required' })

    // Load booking (use depth=1 to possibly get nested event info)
    const booking = await payload.findByID({
      collection: 'bookings',
      id: bookingId,
      depth: 1,
    })

    if (!booking) return res.status(404).json({ error: 'Booking not found' })

    const bookingUserId = relToId((booking as any).user)
    const bookingTenant = relToId((booking as any).tenant)
    const bookingEventId = relToId((booking as any).event)

    // Tenant check - ensure same tenant
    const userTenant = relToId((user as any).tenant)
    if (bookingTenant !== userTenant) {
      return res.status(403).json({ error: 'Booking belongs to another tenant' })
    }

    // Attendees may only cancel their own bookings
    if ((user as any).role === 'attendee' && bookingUserId !== (user as any).id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Update booking to canceled
    const updated = await payload.update({
      collection: 'bookings',
      id: bookingId,
      data: { status: 'canceled' },
    })

    // Canceled notification for original booking user
    await payload.create({
      collection: 'notifications',
      data: {
        user: bookingUserId,
        booking: bookingId,
        type: 'booking_canceled',
        title: 'Booking Canceled',
        message: `Your booking for ${(booking as any).event?.title ?? bookingEventId} has been canceled.`,
        tenant: bookingTenant,
      },
    })

    // Log cancellation
    await payload.create({
      collection: 'bookingLogs',
      data: {
        booking: bookingId,
        event: bookingEventId,
        user: bookingUserId,
        action: 'cancel_confirmed',
        note: 'Booking canceled',
        tenant: bookingTenant,
      },
    })

    // If the booking was confirmed, promote the oldest waitlisted booking (tenant-scoped)
    if ((booking as any).status === 'confirmed') {
      const oldestWaitlisted = await payload.find({
        collection: 'bookings',
        where: {
          and: [
            { event: { equals: bookingEventId } },
            { status: { equals: 'waitlisted' } },
            { tenant: { equals: bookingTenant } },
          ],
        },
        sort: 'createdAt',
        limit: 1,
        depth: 0,
      })

      if (oldestWaitlisted.docs.length > 0) {
        const promote = oldestWaitlisted.docs[0]
        await payload.update({
          collection: 'bookings',
          id: promote.id,
          data: { status: 'confirmed' },
        })

        // Notification to promoted user
        await payload.create({
          collection: 'notifications',
          data: {
            user: relToId(promote.user),
            booking: promote.id,
            type: 'waitlist_promoted',
            title: 'Promoted from Waitlist',
            message: `Your booking for ${(booking as any).event?.title ?? bookingEventId} has been promoted to confirmed.`,
            tenant: bookingTenant,
          },
        })

        // Log promotion
        await payload.create({
          collection: 'bookingLogs',
          data: {
            booking: promote.id,
            event: bookingEventId,
            user: relToId(promote.user),
            action: 'promote_from_waitlist',
            note: 'Promoted from waitlist after cancellation',
            tenant: bookingTenant,
          },
        })
      }
    }

    return res.status(200).json(updated)
  } catch (err) {
    payload.logger.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}