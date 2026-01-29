import { EventService } from './EventService';
import { BookingService } from './BookingService';
import { NotificationService } from './NotificationService';
import { getTenantId } from '@/middleware/auth';
import type { User } from '@/payload-types';

export interface EventStats {
  id: string | number;
  title: string;
  date: string;
  capacity: number;
  confirmed: number;
  waitlisted: number;
  canceled: number;
  percentageFilled: number;
}

export interface DashboardSummary {
  totalEvents: number;
  totalConfirmed: number;
  totalWaitlisted: number;
  totalCanceled: number;
}

export interface DashboardData {
  events: EventStats[];
  summary: DashboardSummary;
  recentActivity: any[];
}

export class DashboardService {
  static async getDashboardData(user: User): Promise<DashboardData> {
    const tenantIdValue = getTenantId(user);

    // Get events
    const eventsResult = await EventService.findByTenant(user);

    // Get stats for each event
    const eventStats = await Promise.all(
      eventsResult.docs.map(async (event) => {
        const { confirmed, waitlisted, canceled } = await BookingService.getEventStats(event.id, user);
        const percentageFilled = event.capacity
          ? Math.round((confirmed / event.capacity) * 100)
          : 0;

        return {
          id: event.id,
          title: event.title,
          date: event.date,
          capacity: event.capacity,
          confirmed,
          waitlisted,
          canceled,
          percentageFilled,
        };
      })
    );

    // Summary analytics
    const summary = {
      totalEvents: eventsResult.totalDocs,
      totalConfirmed: eventStats.reduce((a, e) => a + e.confirmed, 0),
      totalWaitlisted: eventStats.reduce((a, e) => a + e.waitlisted, 0),
      totalCanceled: eventStats.reduce((a, e) => a + e.canceled, 0),
    };

    // Recent activity
    const recentActivityResult = await NotificationService.findRecentByTenant(user);
    const recentActivity = recentActivityResult.docs;

    return {
      events: eventStats,
      summary,
      recentActivity,
    };
  }
}