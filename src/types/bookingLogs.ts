// Strict TypeScript interfaces for BookingLogs collection
export type BookingLogAction = 'create_request' | 'auto_waitlist' | 'auto_confirm' | 'promote_from_waitlist' | 'cancel_confirmed';

export interface BookingLogData {
  booking?: string | number;
  event?: string | number;
  user?: string | number;
  action: BookingLogAction;
  note?: string;
  tenant: string | number;
}

export interface BookingLog extends BookingLogData {
  id: string | number;
  createdAt: string;
  updatedAt: string;
}