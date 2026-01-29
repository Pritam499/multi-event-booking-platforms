import { ApiError } from '@/middleware/errorHandler';
import { QueryBuilderFactory, type QueryResult } from '@/utils/queryBuilder';
import { requireOwnership } from '@/utils/rbac';
import type { Notification } from '@/types';
import type { User } from '@/payload-types';

export class NotificationService {
  static async findUnreadByUser(user: User): Promise<QueryResult<Notification>> {
    const queryBuilder = QueryBuilderFactory.notifications(user);
    return (queryBuilder as any).findUnreadByUser(user.id);
  }

  static async markAsRead(notificationId: string | number, user: User): Promise<Notification> {
    const queryBuilder = QueryBuilderFactory.notifications(user);
    return (queryBuilder as any).markAsRead(notificationId, user);
  }

  static async findById(notificationId: string | number, user: User): Promise<Notification> {
    const queryBuilder = QueryBuilderFactory.notifications(user);
    const notification = await queryBuilder.findById(notificationId);
    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }
    return notification as Notification;
  }

  static async findRecentByTenant(user: User, limit: number = 5): Promise<QueryResult<any>> {
    // For booking logs, we need to use the generic query builder
    const queryBuilder = QueryBuilderFactory.create('booking-logs', user);
    return queryBuilder.find({
      sort: '-createdAt',
      limit,
      depth: 2,
      user,
    });
  }
}