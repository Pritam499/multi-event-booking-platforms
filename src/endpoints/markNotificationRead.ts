import type { PayloadRequest } from 'payload'
import type { Response } from 'express'
import payload from 'payload'

function relToId(rel: any) {
  if (!rel) return null
  if (typeof rel === 'string') return rel
  if (typeof rel === 'object') return rel.id ?? rel._id ?? null
  return null
}

export default async function markNotificationRead(
  req: PayloadRequest & { params: { id?: string } },
  res: Response
) {
  try {
    const { user } = req
    const { id } = req.params

    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (!id) return res.status(400).json({ error: 'Notification id is required' })

    const notification = await payload.findByID({
      collection: 'notifications',
      id,
      depth: 0,
    })

    if (!notification) return res.status(404).json({ error: 'Notification not found' })

    const notifUserId = relToId((notification as any).user)
    if (notifUserId !== (user as any).id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const updated = await payload.update({
      collection: 'notifications',
      id,
      data: { read: true },
    })

    return res.status(200).json(updated)
  } catch (err) {
    payload.logger.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
