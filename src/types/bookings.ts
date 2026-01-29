// Strict TypeScript interfaces for Bookings collection
export interface BookingData {
  event: string | number;
  user: string | number;
  status: 'confirmed' | 'waitlisted' | 'canceled';
  tenant: string | number;
}

export interface Booking extends BookingData {
  id: string | number;
  createdAt: string;
  updatedAt: string;
}