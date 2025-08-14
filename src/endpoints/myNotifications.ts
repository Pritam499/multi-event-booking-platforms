import type { PayloadRequest } from 'payload'
import type { Response } from 'express'
import payload from 'payload'

export default async function myNotifications(req: PayloadRequest, res: Response) {
  try {
    const { user } = req
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const notifications = await payload.find({
      collection: 'notifications',
      where: {
        and: [
          { user: { equals: (user as any).id } },
          { read: { equals: false } },
        ],
      },
      sort: '-createdAt',
      depth: 1,
    })

    return res.status(200).json(notifications.docs)
  } catch (err) {
    payload.logger.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}