import type { GeneratedTypes } from 'payload'

declare module 'payload' {
  export interface GeneratedTypes {
    collections: {
      'tenants': any
      'users': any
      'events': any
      'bookings': any
      'notifications': any
      'booking-logs': any
      'categories': any
      'media': any
    }
  }
}