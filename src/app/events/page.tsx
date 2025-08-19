'use client'

import { useEffect, useState } from 'react'

type Event = {
  id: string
  title: string
  capacity: number
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events?depth=0')
        const data = await res.json()
        setEvents(data.docs || [])
      } catch (err) {
        console.error('Error fetching events:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  const handleBook = async (eventId: string) => {
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: eventId,
        }),
      })
      const data = await res.json()
      alert(
        data?.status === 'confirmed'
          ? '🎉 Booking confirmed!'
          : '⏳ Added to waitlist.'
      )
    } catch (err) {
      console.error('Booking failed:', err)
      alert('Booking failed')
    }
  }

  if (loading) return <p className="p-4">Loading events...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Available Events</h1>
      {events.length === 0 ? (
        <p>No events available</p>
      ) : (
        <ul className="space-y-4">
          {events.map((ev) => (
            <li key={ev.id} className="p-4 border rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold">{ev.title}</h2>
              <p>Capacity: {ev.capacity}</p>
              <button
                onClick={() => handleBook(ev.id)}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Book Now
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
