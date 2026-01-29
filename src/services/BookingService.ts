import { ApiError } from '@/middleware/errorHandler';
import { QueryBuilderFactory, type QueryResult } from '@/utils/queryBuilder';
import { requireOwnership } from '@/utils/rbac';
import type { Booking } from '@/types';
import type { User } from '@/payload-types';

export class BookingService {
  static async create(eventId: string | number, user: User): Promise<Booking> {
    // Verify event exists
    await EventService.findById(eventId, user);

    const bookingData = { event: eventId };
    const queryBuilder = QueryBuilderFactory.bookings(user);
    const booking = await queryBuilder.create(bookingData, user);
    return booking as Booking;
  }

  static async findById(bookingId: string | number, user: User): Promise<Booking> {
    const queryBuilder = QueryBuilderFactory.bookings(user);
    const booking = await queryBuilder.findById(bookingId);
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }
    return booking as Booking;
  }

  static async findByUser(user: User, options?: { sort?: string; depth?: number }): Promise<QueryResult<Booking>> {
    const queryBuilder = QueryBuilderFactory.bookings(user);
    return queryBuilder.find({
      sort: options?.sort || '-createdAt',
      depth: options?.depth || 2,
      user,
    });
  }

  static async cancel(bookingId: string | number, user: User): Promise<Booking> {
    const booking = await this.findById(bookingId, user);

    // Check permissions - attendees can only cancel their own bookings
    if (user.role === 'attendee') {
      requireOwnership(user, booking.user, 'booking');
    }

    const queryBuilder = QueryBuilderFactory.bookings(user);
    const updated = await queryBuilder.update(bookingId, { status: 'canceled' }, user);

    return updated as Booking;
  }

  static async getEventStats(eventId: string | number, user: User) {
    const queryBuilder = QueryBuilderFactory.bookings(user);
    return (queryBuilder as any).getEventStats(eventId);
  }
}

// Import EventService to avoid circular dependency
import { EventService } from './EventService';