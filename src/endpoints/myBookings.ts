import type { PayloadRequest } from 'payload'
import type { Response } from 'express'
import payload from 'payload'

export default async function myBookings(req: PayloadRequest, res: Response) {
  try {
    const { user } = req
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const bookings = await payload.find({
      collection: 'bookings',
      where: {
        user: { equals: (user as any).id },
      },
      depth: 1,
      sort: '-createdAt',
    })

    return res.status(200).json(bookings.docs)
  } catch (err) {
    payload.logger.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}