import { NextRequest } from 'next/server';
import { BookingService } from '@/services/BookingService';
import { ApiResponse } from '@/utils/apiResponse';
import { ApiUtils } from '@/utils/apiUtils';
import { bookEventSchema, cancelBookingSchema } from '@/schemas/zod/bookings';
import type { User } from '@/payload-types';

export class BookingController {
  static async bookEvent(user: User, tenantId: string | number, request: NextRequest) {
    const body = await ApiUtils.parseJsonBody<{ eventId: string | number }>(request, bookEventSchema);
    const { eventId } = body;

    const booking = await BookingService.create(eventId, user);

    return ApiResponse.success(booking, 'Event booked successfully', 201);
  }

  static async cancelBooking(user: User, tenantId: string | number, request: NextRequest) {
    const body = await ApiUtils.parseJsonBody<{ bookingId: string | number }>(request, cancelBookingSchema);
    const { bookingId } = body;

    const updatedBooking = await BookingService.cancel(bookingId, user);

    return ApiResponse.success(updatedBooking, 'Booking canceled successfully');
  }

  static async getMyBookings(user: User, tenantId: string | number, request: NextRequest) {
    const bookingsResult = await BookingService.findByUser(user);

    return ApiResponse.success(bookingsResult.docs);
  }
}