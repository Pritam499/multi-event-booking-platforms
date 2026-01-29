// Collection slugs constants for type safety
export const COLLECTIONS = {
  TENANTS: 'tenants',
  USERS: 'users',
  EVENTS: 'events',
  BOOKINGS: 'bookings',
  NOTIFICATIONS: 'notifications',
  BOOKING_LOGS: 'booking-logs',
} as const;

// Type-safe collection names
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];

// For relationTo, we can use the same
export const RELATION_TO = COLLECTIONS;