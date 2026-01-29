import { NextRequest } from 'next/server';
import { NotificationService } from '@/services/NotificationService';
import { ApiResponse } from '@/utils/apiResponse';
import type { User } from '@/payload-types';

export class NotificationController {
  static async getMyNotifications(user: User, tenantId: string | number, request: NextRequest) {
    const notificationsResult = await NotificationService.findUnreadByUser(user);

    return ApiResponse.success(notificationsResult.docs);
  }

  static async markAsRead(user: User, tenantId: string | number, request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const updatedNotification = await NotificationService.markAsRead(id, user);

    return ApiResponse.success(updatedNotification, 'Notification marked as read');
  }
}