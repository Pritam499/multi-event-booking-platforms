import { TenantService } from '@/services/TenantService';
import { ApiResponse } from '@/utils/apiResponse';
import { withTenantManagement, withAutoTenant } from '@/middleware/autoTenant';

const getTenants = async (user: any, tenantId: string | number, request: Request) => {
  const tenants = await TenantService.findAccessibleTenants(user);
  return ApiResponse.success(tenants);
};

const createTenant = async (user: any, tenantId: string | number, request: Request) => {
  const body = await request.json();
  const { name, slug } = body;

  if (!name || !slug) {
    return ApiResponse.error('Tenant name and slug are required', 400);
  }

  // Check if slug is available
  const isAvailable = await TenantService.isSlugAvailable(slug);
  if (!isAvailable) {
    return ApiResponse.error('Tenant slug is already taken', 409);
  }

  const tenant = await TenantService.create({ name, slug }, user);
  return ApiResponse.success(tenant, 'Tenant created successfully', 201);
};

export const GET = withAutoTenant(getTenants, {
  requiredRoles: ['superAdmin'], // Only super admins can list all tenants
});

export const POST = withTenantManagement(createTenant);