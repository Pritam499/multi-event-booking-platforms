import { ApiError } from '@/middleware/errorHandler';
import { QueryBuilderFactory, type QueryResult } from '@/utils/queryBuilder';
import type { Event } from '@/types';
import type { User } from '@/payload-types';

export class EventService {
  static async findById(eventId: string | number, user: User): Promise<Event> {
    const queryBuilder = QueryBuilderFactory.events(user);
    const event = await queryBuilder.findById(eventId);
    if (!event) {
      throw ApiError.notFound('Event not found');
    }
    return event as Event;
  }

  static async findByTenant(user: User, options?: { sort?: string; depth?: number }): Promise<QueryResult<Event>> {
    const queryBuilder = QueryBuilderFactory.events(user);
    return queryBuilder.find({
      sort: options?.sort || 'date',
      depth: options?.depth || 1,
      user,
    });
  }

  static async findUpcoming(user: User): Promise<QueryResult<Event>> {
    const queryBuilder = QueryBuilderFactory.events(user);
    return (queryBuilder as any).findUpcoming();
  }

  static async countBookingsByStatus(eventId: string | number, user: User, status: string): Promise<number> {
    const queryBuilder = QueryBuilderFactory.bookings(user);
    const result = await queryBuilder.count({
      where: {
        event: { equals: eventId },
        status: { equals: status },
      },
      user,
    });

    return result.totalDocs;
  }

  static async create(data: any, user: User): Promise<Event> {
    const queryBuilder = QueryBuilderFactory.events(user);
    return queryBuilder.create(data, user);
  }

  static async update(eventId: string | number, data: any, user: User): Promise<Event> {
    const queryBuilder = QueryBuilderFactory.events(user);
    return queryBuilder.update(eventId, data, user);
  }

  static async delete(eventId: string | number, user: User): Promise<void> {
    const queryBuilder = QueryBuilderFactory.events(user);
    return queryBuilder.delete(eventId, user);
  }
}