import payload from 'payload'

export async function checkEventCapacity(eventId: string): Promise<{
  hasCapacity: boolean
  confirmedCount: number
}> {
  const event = await payload.findByID({
    collection: 'events',
    id: eventId,
  })

  if (!event) {
    throw new Error('Event not found')
  }

  const confirmedBookings = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { event: { equals: eventId } },
        { status: { equals: 'confirmed' } },
      ],
    },
  })

  return {
    hasCapacity: confirmedBookings.totalDocs < event.capacity,
    confirmedCount: confirmedBookings.totalDocs,
  }
}