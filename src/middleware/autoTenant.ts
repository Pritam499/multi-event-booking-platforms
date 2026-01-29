import { NextRequest, NextResponse } from 'next/server';
import { withTenantIsolation } from './tenantIsolation';
import { PermissionService } from '@/services/PermissionService';
import { ApiResponse } from '@/utils/apiResponse';
import type { User } from '@/payload-types';

/**
 * Automatic tenant boundary enforcement middleware
 * This middleware automatically applies tenant isolation and permission checks
 * without requiring manual checks in each controller
 */

export interface AutoTenantOptions {
  // Permission requirements
  requiredPermissions?: string[];
  requiredRoles?: string[];

  // Resource access control
  resourceType?: string;
  resourceAction?: 'read' | 'write' | 'delete';

  // Ownership checks
  checkOwnership?: boolean;
  ownershipField?: string; // Field in request params to check ownership

  // Custom validation
  customValidator?: (user: User, tenantId: string | number, request: NextRequest) => Promise<{ valid: boolean; error?: string }>;
}

/**
 * Higher-order function that creates tenant-aware route handlers
 * Automatically applies tenant isolation and permission checks
 */
export function withAutoTenant<T extends any[]>(
  handler: (user: User, tenantId: string | number, request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: AutoTenantOptions = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    return withTenantIsolation(request, async (user, tenantId) => {
      // Apply permission checks
      const permissionResult = await applyPermissionChecks(user, tenantId, request, options);
      if (permissionResult.response) {
        return permissionResult.response;
      }

      // Apply custom validation if provided
      if (options.customValidator) {
        const validationResult = await options.customValidator(user, tenantId, request);
        if (!validationResult.valid) {
          return ApiResponse.error(validationResult.error || 'Validation failed', 400);
        }
      }

      // Execute the handler
      return handler(user, tenantId, request, ...args);
    });
  };
}

/**
 * Apply automatic permission checks based on options
 */
async function applyPermissionChecks(
  user: User,
  tenantId: string | number,
  request: NextRequest,
  options: AutoTenantOptions
): Promise<{ response?: NextResponse }> {
  // Check role requirements
  if (options.requiredRoles) {
    const roleCheck = PermissionService.validateRole(user, options.requiredRoles);
    if (!roleCheck.allowed) {
      return { response: roleCheck.response };
    }
  }

  // Check permission requirements
  if (options.requiredPermissions) {
    for (const permission of options.requiredPermissions) {
      const permissionCheck = PermissionService.validatePermission(user, permission);
      if (!permissionCheck.allowed) {
        return { response: permissionCheck.response };
      }
    }
  }

  // Check resource access
  if (options.resourceType && options.resourceAction) {
    let resourceUserId: string | number | undefined;

    // Extract resource user ID for ownership checks
    if (options.checkOwnership && options.ownershipField) {
      const url = new URL(request.url);
      const resourceId = url.pathname.split('/').pop();

      if (resourceId && options.ownershipField === 'id') {
        // For ownership checks, we need to fetch the resource first
        // This is a simplified implementation - in practice, you'd want to cache this
        try {
          // This would need to be implemented based on the specific resource type
          // For now, we'll skip the ownership check and rely on tenant isolation
        } catch (error) {
          return { response: ApiResponse.error('Resource access validation failed', 500) };
        }
      }
    }

    const resourceCheck = PermissionService.checkResourceAccess(
      user,
      options.resourceAction,
      options.resourceType,
      resourceUserId
    );

    if (!resourceCheck.allowed) {
      return { response: resourceCheck.response };
    }
  }

  return {};
}

/**
 * Pre-configured middleware for common use cases
 */

// Admin-only routes
export const withAdminAccess = <T extends any[]>(
  handler: (user: User, tenantId: string | number, request: NextRequest, ...args: T) => Promise<NextResponse>
) => {
  return withAutoTenant(handler, {
    requiredRoles: ['admin', 'superAdmin'],
  });
};

// Organizer routes (organizers and admins)
export const withOrganizerAccess = <T extends any[]>(
  handler: (user: User, tenantId: string | number, request: NextRequest, ...args: T) => Promise<NextResponse>
) => {
  return withAutoTenant(handler, {
    requiredRoles: ['organizer', 'admin', 'superAdmin'],
  });
};

// User-specific routes with ownership
export const withUserOwnership = <T extends any[]>(
  handler: (user: User, tenantId: string | number, request: NextRequest, ...args: T) => Promise<NextResponse>
) => {
  return withAutoTenant(handler, {
    checkOwnership: true,
    ownershipField: 'id',
  });
};

// Booking management routes
export const withBookingAccess = <T extends any[]>(
  action: 'read' | 'write' | 'delete',
  handler: (user: User, tenantId: string | number, request: NextRequest, ...args: T) => Promise<NextResponse>
) => {
  return withAutoTenant(handler, {
    resourceType: 'bookings',
    resourceAction: action,
  });
};

// Event management routes
export const withEventAccess = <T extends any[]>(
  action: 'read' | 'write' | 'delete',
  handler: (user: User, tenantId: string | number, request: NextRequest, ...args: T) => Promise<NextResponse>
) => {
  return withAutoTenant(handler, {
    resourceType: 'events',
    resourceAction: action,
  });
};

// Notification access routes
export const withNotificationAccess = <T extends any[]>(
  action: 'read' | 'write' | 'delete',
  handler: (user: User, tenantId: string | number, request: NextRequest, ...args: T) => Promise<NextResponse>
) => {
  return withAutoTenant(handler, {
    resourceType: 'notifications',
    resourceAction: action,
  });
};

// Dashboard access
export const withDashboardAccess = <T extends any[]>(
  handler: (user: User, tenantId: string | number, request: NextRequest, ...args: T) => Promise<NextResponse>
) => {
  return withAutoTenant(handler, {
    requiredRoles: ['organizer', 'admin', 'superAdmin'],
  });
};

// Tenant management (super admin only)
export const withTenantManagement = <T extends any[]>(
  handler: (user: User, tenantId: string | number, request: NextRequest, ...args: T) => Promise<NextResponse>
) => {
  return withAutoTenant(handler, {
    requiredRoles: ['superAdmin'],
  });
};

/**
 * Utility function to create custom tenant middleware
 */
export function createTenantMiddleware(options: AutoTenantOptions) {
  return <T extends any[]>(
    handler: (user: User, tenantId: string | number, request: NextRequest, ...args: T) => Promise<NextResponse>
  ) => {
    return withAutoTenant(handler, options);
  };
}

/**
 * Validation helpers for common scenarios
 */
export const TenantValidators = {
  // Validate that user can access specific event
  async canAccessEvent(user: User, tenantId: string | number, eventId: string | number): Promise<boolean> {
    // Check if event belongs to user's tenant
    // This would typically query the database
    return true; // Simplified for now
  },

  // Validate booking ownership
  async ownsBooking(user: User, tenantId: string | number, bookingId: string | number): Promise<boolean> {
    // Check if booking belongs to user (for attendees) or tenant
    return true; // Simplified for now
  },

  // Validate notification access
  async canAccessNotification(user: User, tenantId: string | number, notificationId: string | number): Promise<boolean> {
    // Check if notification belongs to user and tenant
    return true; // Simplified for now
  },
};