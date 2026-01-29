import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/utils/apiResponse';
import { ApiError } from '@/middleware/errorHandler';
import { AuthService } from '@/services/AuthService';
import type { User } from '@/payload-types';

/**
 * Authentication middleware utilities
 */

/**
 * Verify JWT token and extract user information
 */
export async function verifyToken(request: NextRequest): Promise<User | null> {
  try {
    const token = AuthService.extractTokenFromRequest(request);
    if (!token) {
      return null;
    }

    return await AuthService.getUserFromToken(token);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Middleware that requires authentication
 * Returns 401 if user is not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<{ user: User; response?: NextResponse }> {
  const user = await verifyToken(request);

  if (!user) {
    const response = ApiResponse.unauthorized('Authentication required');
    return { user: null as any, response };
  }

  return { user };
}

/**
 * Middleware that optionally checks authentication
 * Returns user if authenticated, null if not
 */
export async function optionalAuth(request: NextRequest): Promise<User | null> {
  return await verifyToken(request);
}

/**
 * Middleware that requires specific roles
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<{ user: User; response?: NextResponse }> {
  const { user, response } = await requireAuth(request);

  if (response) {
    return { user: null as any, response };
  }

  if (!allowedRoles.includes(user.role)) {
    const response = ApiResponse.forbidden(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
    return { user: null as any, response };
  }

  return { user };
}

/**
 * Middleware that requires tenant membership
 */
export async function requireTenant(request: NextRequest): Promise<{ user: User; response?: NextResponse }> {
  const { user, response } = await requireAuth(request);

  if (response) {
    return { user: null as any, response };
  }

  const tenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
  if (!tenantId) {
    const response = ApiResponse.forbidden('User must belong to a tenant');
    return { user: null as any, response };
  }

  return { user };
}

/**
 * Middleware that requires both authentication and tenant membership
 */
export async function requireAuthAndTenant(request: NextRequest): Promise<{ user: User; response?: NextResponse }> {
  const { user, response } = await requireAuth(request);

  if (response) {
    return { user: null as any, response };
  }

  const tenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
  if (!tenantId) {
    const response = ApiResponse.forbidden('User must belong to a tenant');
    return { user: null as any, response };
  }

  return { user };
}

/**
 * Middleware that checks resource ownership
 */
export async function requireOwnership(
  request: NextRequest,
  resourceUserId: string | number,
  resourceName: string = 'resource'
): Promise<{ response?: NextResponse }> {
  const { user, response } = await requireAuth(request);

  if (response) {
    return { response };
  }

  if (user.role === 'attendee' && user.id !== resourceUserId) {
    const response = ApiResponse.forbidden(`Access denied. You can only access your own ${resourceName}`);
    return { response };
  }

  return {};
}

/**
 * Higher-order function to create role-based middleware
 */
export function withRoles(allowedRoles: string[]) {
  return async function(request: NextRequest): Promise<{ user: User; response?: NextResponse }> {
    return requireRole(request, allowedRoles);
  };
}

/**
 * Higher-order function to create permission-based middleware
 */
export function withPermissions(requiredPermissions: string[]) {
  return async function(request: NextRequest): Promise<{ user: User; response?: NextResponse }> {
    const { user, response } = await requireAuth(request);

    if (response) {
      return { user: null as any, response };
    }

    // Check if user has required permissions based on their role
    // This is a simplified implementation - you might want to implement
    // a more sophisticated permission system
    const rolePermissions: Record<string, string[]> = {
      superAdmin: ['*'], // Has all permissions
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_events'],
      organizer: ['read', 'write', 'manage_events'],
      attendee: ['read', 'book_events'],
    };

    const userPermissions = rolePermissions[user.role] || [];
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission) || userPermissions.includes('*')
    );

    if (!hasAllPermissions) {
      const response = ApiResponse.forbidden(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`);
      return { user: null as any, response };
    }

    return { user };
  };
}

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
 * Check if user owns a resource (attendee can only access their own resources)
 */
export function canAccessResource(user: User, resourceUserId: string | number): boolean {
  if (user.role === 'superAdmin' || user.role === 'admin') {
    return true; // Admins can access everything
  }

  if (user.role === 'organizer') {
    // Organizers can access resources in their tenant
    const tenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
    // This would need the resource's tenant ID to check properly
    // For now, return true - implement tenant-based checks in specific controllers
    return true;
  }

  // Attendees can only access their own resources
  return user.id === resourceUserId;
}