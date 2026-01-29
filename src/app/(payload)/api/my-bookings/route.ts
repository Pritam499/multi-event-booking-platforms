import { BookingController } from '@/controllers/BookingController';
import { withBookingAccess } from '@/middleware/autoTenant';

export const GET = withBookingAccess('read', BookingController.getMyBookings);
