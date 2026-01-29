import { NotificationController } from '@/controllers/NotificationController';
import { withNotificationAccess } from '@/middleware/autoTenant';

export const GET = withNotificationAccess('read', NotificationController.getMyNotifications);
