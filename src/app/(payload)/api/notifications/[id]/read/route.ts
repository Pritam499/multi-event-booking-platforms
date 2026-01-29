import { NotificationController } from '@/controllers/NotificationController';
import { withNotificationAccess } from '@/middleware/autoTenant';

export const POST = withNotificationAccess('write', NotificationController.markAsRead);
