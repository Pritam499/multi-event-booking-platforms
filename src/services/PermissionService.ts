import { ApiResponse } from '@/utils/apiResponse';
import {
  hasRole,
  hasPermission,
  canPerformAction,
  isOwner,
  isSameTenant,
  requireRole,
  requirePermission,
  requireOwnership
} from '@/utils/rbac';
import type { User } from '@/payload-types';

/**
 * Permission checking service to eliminate duplicate authorization code from controllers
 */
export class PermissionService {
  /**
   * Check if user can access a resource and return appropriate response
   */
  static checkResourceAccess(
    user: User | null,
    action: string,
    resourceType: string,
    resourceUserId?: string | number,
    resourceTenantId?: string | number
  ): { allowed: boolean; response?: any } {
    if (!canPerformAction(user, action, resourceType, resourceUserId, resourceTenantId)) {
      return {
        allowed: false,
        response: ApiResponse.forbidden(`You do not have permission to ${action} ${resourceType}`)
      };
    }

    return { allowed: true };
  }

  /**
   * Check booking permissions
   */
  static checkBookingAccess(user: User | null, action: 'read' | 'write' | 'delete', bookingUserId?: string | number): { allowed: boolean; response?: any } {
    return this.checkResourceAccess(user, action, 'bookings', bookingUserId);
  }

  /**
   * Check event permissions
   */
  static checkEventAccess(user: User | null, action: 'read' | 'write' | 'delete', eventTenantId?: string | number): { allowed: boolean; response?: any } {
    return this.checkResourceAccess(user, action, 'events', undefined, eventTenantId);
  }

  /**
   * Check notification permissions
   */
  static checkNotificationAccess(user: User | null, action: 'read' | 'write' | 'delete', notificationUserId?: string | number): { allowed: boolean; response?: any } {
    return this.checkResourceAccess(user, action, 'notifications', notificationUserId);
  }

  /**
   * Check user management permissions
   */
  static checkUserManagementAccess(user: User | null, action: 'read' | 'write' | 'delete', targetUser?: User | null): { allowed: boolean; response?: any } {
    if (!user) {
      return { allowed: false, response: ApiResponse.unauthorized() };
    }

    // Super admin can manage all users
    if (hasRole(user, ['superAdmin'])) {
      return { allowed: true };
    }

    // Admin can manage users in their tenant
    if (hasRole(user, ['admin'])) {
      if (targetUser) {
        const targetTenantId = typeof targetUser.tenant === 'object' ? targetUser.tenant?.id : targetUser.tenant;
        if (targetTenantId != null && !isSameTenant(user, targetTenantId)) {
          return { allowed: false, response: ApiResponse.forbidden('Cannot manage users from different tenants') };
        }
      }
      return { allowed: true };
    }

    // Organizers can only view users in their tenant
    if (hasRole(user, ['organizer']) && action === 'read') {
      if (targetUser) {
        const targetTenantId = typeof targetUser.tenant === 'object' ? targetUser.tenant?.id : targetUser.tenant;
        if (targetTenantId != null && !isSameTenant(user, targetTenantId)) {
          return { allowed: false, response: ApiResponse.forbidden('Cannot view users from different tenants') };
        }
      }
      return { allowed: true };
    }

    return { allowed: false, response: ApiResponse.forbidden('Insufficient permissions for user management') };
  }

  /**
   * Check dashboard access
   */
  static checkDashboardAccess(user: User | null): { allowed: boolean; response?: any } {
    if (!user) {
      return { allowed: false, response: ApiResponse.unauthorized() };
    }

    if (!hasRole(user, ['organizer', 'admin', 'superAdmin'])) {
      return { allowed: false, response: ApiResponse.forbidden('Dashboard access requires organizer or admin role') };
    }

    // Check tenant membership
    const tenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
    if (!tenantId) {
      return { allowed: false, response: ApiResponse.forbidden('User must belong to a tenant') };
    }

    return { allowed: true };
  }

  /**
   * Check tenant access
   */
  static checkTenantAccess(user: User | null, action: 'read' | 'write' | 'delete', tenantId?: string | number): { allowed: boolean; response?: any } {
    if (!user) {
      return { allowed: false, response: ApiResponse.unauthorized() };
    }

    // Super admin can access all tenants
    if (hasRole(user, ['superAdmin'])) {
      return { allowed: true };
    }

    // For non-super-admin users, they can only access their own tenant
    if (tenantId) {
      const userTenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
      if (!isSameTenant(user, tenantId)) {
        return { allowed: false, response: ApiResponse.forbidden('Cannot access resources from different tenants') };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if user can perform action on specific resource
   */
  static checkOwnership(user: User | null, resourceUserId: string | number, resourceName: string = 'resource'): { allowed: boolean; response?: any } {
    if (!user) {
      return { allowed: false, response: ApiResponse.unauthorized() };
    }

    // Super admin can access everything
    if (hasRole(user, ['superAdmin'])) {
      return { allowed: true };
    }

    // Attendees can only access their own resources
    if (hasRole(user, ['attendee'])) {
      if (!isOwner(user, resourceUserId)) {
        return { allowed: false, response: ApiResponse.forbidden(`You can only access your own ${resourceName}`) };
      }
    }

    return { allowed: true };
  }

  /**
   * Validate role requirements
   */
  static validateRole(user: User | null, requiredRoles: string[]): { allowed: boolean; response?: any } {
    if (!hasRole(user, requiredRoles)) {
      return {
        allowed: false,
        response: ApiResponse.forbidden(`Access denied. Required roles: ${requiredRoles.join(', ')}`)
      };
    }
    return { allowed: true };
  }

  /**
   * Validate permission requirements
   */
  static validatePermission(user: User | null, requiredPermission: string): { allowed: boolean; response?: any } {
    if (!hasPermission(user, requiredPermission)) {
      return {
        allowed: false,
        response: ApiResponse.forbidden(`Access denied. Required permission: ${requiredPermission}`)
      };
    }
    return { allowed: true };
  }

  /**
   * Comprehensive access check combining multiple factors
   */
  static checkAccess(options: {
    user: User | null;
    action: string;
    resourceType: string;
    resourceUserId?: string | number;
    resourceTenantId?: string | number;
    requiredRoles?: string[];
    requiredPermission?: string;
  }): { allowed: boolean; response?: any } {
    const { user, action, resourceType, resourceUserId, resourceTenantId, requiredRoles, requiredPermission } = options;

    // Check authentication
    if (!user) {
      return { allowed: false, response: ApiResponse.unauthorized() };
    }

    // Check role requirements
    if (requiredRoles) {
      const roleCheck = this.validateRole(user, requiredRoles);
      if (!roleCheck.allowed) return roleCheck;
    }

    // Check permission requirements
    if (requiredPermission) {
      const permissionCheck = this.validatePermission(user, requiredPermission);
      if (!permissionCheck.allowed) return permissionCheck;
    }

    // Check resource-specific access
    const resourceCheck = this.checkResourceAccess(user, action, resourceType, resourceUserId, resourceTenantId);
    if (!resourceCheck.allowed) return resourceCheck;

    return { allowed: true };
  }
}