// Strict TypeScript interfaces for Notifications collection
export type NotificationType = 'booking_confirmed' | 'waitlisted' | 'waitlist_promoted' | 'booking_canceled';

export interface NotificationData {
  user: string | number;
  booking?: string | number;
  type: NotificationType;
  title?: string;
  message?: string;
  read: boolean;
  tenant: string | number;
}

export interface Notification extends NotificationData {
  id: string | number;
  createdAt: string;
  updatedAt: string;
}