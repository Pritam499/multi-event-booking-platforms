import { CollectionAfterReadHook } from 'payload'

export const notificationAfterReadHook: CollectionAfterReadHook = async ({
  doc,
  req,
}) => {
  // If this is a single notification read (not a list query)
  if (req.query?.where?.id && !doc.read) {
    try {
      await req.payload.update({
        collection: 'notifications',
        id: doc.id,
        data: {
          read: true,
        },
      })
    } catch (error) {
      req.payload.logger.error(`Error marking notification as read: ${error}`)
    }
  }
  return doc
}