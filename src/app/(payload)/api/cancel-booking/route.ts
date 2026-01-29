import { BookingController } from '@/controllers/BookingController';
import { withBookingAccess } from '@/middleware/autoTenant';

export const POST = withBookingAccess('write', BookingController.cancelBooking);
