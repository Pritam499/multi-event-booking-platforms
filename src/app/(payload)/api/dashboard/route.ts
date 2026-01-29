import { DashboardController } from '@/controllers/DashboardController';
import { withDashboardAccess } from '@/middleware/autoTenant';

export const GET = withDashboardAccess(DashboardController.getDashboard);