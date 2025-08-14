import { CollectionAfterChangeHook } from 'payload'
import payload from 'payload'

export const bookingAfterChangeHook: CollectionAfterChangeHook = async ({
  operation,
  doc,
  previousDoc,
  req,
}) => {
  // Skip if no user (system operations)
  if (!req.user) return

  // Only process updates (not initial creation)
  if (operation === 'update') {
    // If status changed
    if (doc.status !== previousDoc.status) {
      let notificationType: string
      let title: string
      let message: string

      switch (doc.status) {
        case 'confirmed':
          notificationType = 'booking_confirmed'
          title = 'Booking Confirmed'
          message = `Your booking for ${doc.event.title} is now confirmed!`
          break
        case 'waitlisted':
          notificationType = 'waitlisted'
          title = 'Added to Waitlist'
          message = `Your booking for ${doc.event.title} has been added to the waitlist.`
          break
        case 'canceled':
          notificationType = 'booking_canceled'
          title = 'Booking Canceled'
          message = `Your booking for ${doc.event.title} has been canceled.`
          break
        default:
          return
      }

      await payload.create({
        collection: 'notifications',
        data: {
          user: doc.user,
          booking: doc.id,
          type: notificationType,
          title,
          message,
          tenant: doc.tenant,
        },
        req,
      })

      let action: string
      switch (doc.status) {
        case 'confirmed':
          action = 'auto_confirm'
          break
        case 'waitlisted':
          action = 'auto_waitlist'
          break
        case 'canceled':
          action = 'cancel_confirmed'
          break
        default:
          return
      }

      await payload.create({
        collection: 'booking-logs',
        data: {
          booking: doc.id,
          event: doc.event,
          user: doc.user,
          action,
          note: `Status changed to ${doc.status}`,
          tenant: doc.tenant,
        },
        req,
      })
    }
  }
}