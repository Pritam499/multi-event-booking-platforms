import { NextRequest } from 'next/server';
import { DashboardService } from '@/services/DashboardService';
import { ApiResponse } from '@/utils/apiResponse';
import type { User } from '@/payload-types';

export class DashboardController {
  static async getDashboard(user: User, tenantId: string | number, request: NextRequest) {
    const dashboardData = await DashboardService.getDashboardData(user);

    return ApiResponse.success(dashboardData);
  }
}