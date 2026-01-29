import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/utils/apiResponse';
import { ApiError } from '@/middleware/errorHandler';
import { requireAuth } from '@/middleware/auth';
import { hasRole, isSuperAdmin } from '@/utils/rbac';
import type { User } from '@/payload-types';

/**
 * Tenant isolation middleware utilities
 */

/**
 * Extract tenant ID from authenticated user
 */
export function getTenantId(user: User): string | number {
  const tenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
  if (!tenantId) {
    throw ApiError.forbidden('User must belong to a tenant');
  }
  return tenantId;
}

/**
 * Middleware that ensures tenant isolation for all requests
 * Automatically scopes data access to the user's tenant
 */
export async function withTenantIsolation(
  request: NextRequest,
  handler: (user: User, tenantId: string | number) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Authenticate user
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Get tenant ID
    const tenantId = getTenantId(user);

    // Execute handler with tenant context
    return await handler(user, tenantId);
  } catch (error) {
    console.error('Tenant isolation error:', error);
    if (error instanceof ApiError) {
      return ApiResponse.error(error.message, error.statusCode);
    }
    return ApiResponse.error('Tenant isolation failed', 500);
  }
}

/**
 * Middleware for tenant-scoped data access
 * Ensures users can only access data within their tenant
 */
export async function requireTenantAccess(
  request: NextRequest,
  options: {
    allowSuperAdmin?: boolean;
    allowCrossTenant?: boolean;
  } = {}
): Promise<{ user: User; tenantId: string | number; response?: NextResponse }> {
  const { allowSuperAdmin = true, allowCrossTenant = false } = options;

  const { user, response } = await requireAuth(request);
  if (response) return { user: null as any, tenantId: null as any, response };

  // Super admin can access all tenants if allowed
  if (allowSuperAdmin && isSuperAdmin(user)) {
    const tenantId = getTenantId(user);
    return { user, tenantId };
  }

  // Check if user belongs to a tenant
  const tenantId = getTenantId(user);

  return { user, tenantId };
}

/**
 * Validate tenant access for a specific resource
 */
export function validateTenantAccess(
  user: User,
  resourceTenantId: string | number,
  options: {
    allowSuperAdmin?: boolean;
  } = {}
): boolean {
  const { allowSuperAdmin = true } = options;

  // Super admin can access all tenants
  if (allowSuperAdmin && isSuperAdmin(user)) {
    return true;
  }

  // Get user's tenant ID
  const userTenantId = getTenantId(user);

  // Check if resource belongs to user's tenant
  return userTenantId === resourceTenantId;
}

/**
 * Create tenant-scoped query constraints
 */
export function createTenantQuery(
  user: User,
  baseWhere: any = {},
  options: {
    allowSuperAdmin?: boolean;
    tenantField?: string;
  } = {}
): any {
  const { allowSuperAdmin = true, tenantField = 'tenant' } = options;

  // Super admin can see all data
  if (allowSuperAdmin && isSuperAdmin(user)) {
    return baseWhere;
  }

  // Regular users can only see data from their tenant
  const tenantId = getTenantId(user);

  return {
    ...baseWhere,
    [tenantField]: {
      equals: tenantId,
    },
  };
}

/**
 * Middleware for tenant data validation
 * Ensures that data being created/updated belongs to the correct tenant
 */
export function validateTenantData(
  user: User,
  data: any,
  tenantField: string = 'tenant'
): { isValid: boolean; error?: string } {
  // Super admin can set any tenant
  if (isSuperAdmin(user)) {
    return { isValid: true };
  }

  const userTenantId = getTenantId(user);
  const dataTenantId = data[tenantField];

  if (dataTenantId && dataTenantId !== userTenantId) {
    return {
      isValid: false,
      error: 'Cannot create/update data for a different tenant'
    };
  }

  // Ensure data is scoped to user's tenant
  data[tenantField] = userTenantId;

  return { isValid: true };
}

/**
 * Higher-order function to create tenant-aware handlers
 */
export function withTenant<T extends any[]>(
  handler: (user: User, tenantId: string | number, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    return withTenantIsolation(request, (user, tenantId) =>
      handler(user, tenantId, ...args)
    );
  };
}

/**
 * Check if user can access a specific tenant
 */
export function canAccessTenant(user: User, tenantId: string | number): boolean {
  // Super admin can access all tenants
  if (isSuperAdmin(user)) {
    return true;
  }

  // Regular users can only access their own tenant
  const userTenantId = getTenantId(user);
  return userTenantId === tenantId;
}

/**
 * Get accessible tenant IDs for a user
 */
export function getAccessibleTenantIds(user: User): (string | number)[] {
  if (isSuperAdmin(user)) {
    // Super admin can access all tenants
    // In a real application, you might want to fetch all tenant IDs
    return ['*']; // Special marker for "all tenants"
  }

  const tenantId = getTenantId(user);
  return [tenantId];
}

/**
 * Middleware for tenant-specific routes
 */
export async function requireTenantRoute(
  request: NextRequest,
  tenantId: string | number
): Promise<{ user: User; response?: NextResponse }> {
  const { user, response } = await requireAuth(request);
  if (response) return { user: null as any, response };

  if (!canAccessTenant(user, tenantId)) {
    return {
      user: null as any,
      response: ApiResponse.forbidden('Access denied to this tenant')
    };
  }

  return { user };
}

/**
 * Extract tenant ID from URL path
 * Assumes tenant ID is in the path like /api/tenants/{tenantId}/...
 */
export function extractTenantIdFromPath(request: NextRequest): string | null {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');

  // Look for tenant ID in path (typically /api/tenants/{tenantId}/...)
  const tenantsIndex = pathParts.indexOf('tenants');
  if (tenantsIndex !== -1 && tenantsIndex + 1 < pathParts.length) {
    return pathParts[tenantsIndex + 1];
  }

  return null;
}

/**
 * Tenant-aware pagination
 */
export function createTenantPaginatedQuery(
  user: User,
  options: {
    page?: number;
    limit?: number;
    sort?: string;
    where?: any;
    tenantField?: string;
  } = {}
) {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    where = {},
    tenantField = 'tenant'
  } = options;

  const tenantQuery = createTenantQuery(user, where, { tenantField });

  return {
    where: tenantQuery,
    page,
    limit,
    sort,
  };
}