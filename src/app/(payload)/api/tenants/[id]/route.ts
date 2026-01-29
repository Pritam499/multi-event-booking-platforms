import { NextRequest } from 'next/server';
import { TenantService } from '@/services/TenantService';
import { PermissionService } from '@/services/PermissionService';
import { ApiResponse } from '@/utils/apiResponse';
import { requireAuth } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/errorHandler';

const getTenant = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const resolvedParams = await context.params;
  const { id } = resolvedParams;

  // Check if user can access this tenant
  const permissionCheck = PermissionService.checkTenantAccess(user, 'read', id);
  if (!permissionCheck.allowed) return permissionCheck.response;

  const tenant = await TenantService.findById(id);
  return ApiResponse.success(tenant);
};

const updateTenant = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const resolvedParams = await context.params;
  const { id } = resolvedParams;

  // Only super admins can update tenants
  const roleCheck = PermissionService.validateRole(user, ['superAdmin']);
  if (!roleCheck.allowed) return roleCheck.response;

  const body = await request.json();
  const { name, slug } = body;

  // Check if new slug is available (excluding current tenant)
  if (slug) {
    const isAvailable = await TenantService.isSlugAvailable(slug, id);
    if (!isAvailable) {
      return ApiResponse.error('Tenant slug is already taken', 409);
    }
  }

  const tenant = await TenantService.update(id, { name, slug }, user);
  return ApiResponse.success(tenant, 'Tenant updated successfully');
};

const deleteTenant = async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const resolvedParams = await context.params;
  const { id } = resolvedParams;

  // Only super admins can delete tenants
  const roleCheck = PermissionService.validateRole(user, ['superAdmin']);
  if (!roleCheck.allowed) return roleCheck.response;

  await TenantService.delete(id, user);
  return ApiResponse.success(null, 'Tenant deleted successfully');
};

export const GET = withErrorHandler(getTenant);
export const PUT = withErrorHandler(updateTenant);
export const DELETE = withErrorHandler(deleteTenant);