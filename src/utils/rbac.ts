import type { User } from '@/payload-types';

/**
 * Role-Based Access Control (RBAC) utilities
 */

/**
 * Check if user has any of the specified roles
 */
export function hasRole(user: User | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if user has a specific role
 */
export function hasRoleExact(user: User | null, role: string): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Check if user has admin privileges (admin or superAdmin)
 */
export function isAdmin(user: User | null): boolean {
  return hasRole(user, ['admin', 'superAdmin']);
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(user: User | null): boolean {
  return hasRoleExact(user, 'superAdmin');
}

/**
 * Check if user is an organizer
 */
export function isOrganizer(user: User | null): boolean {
  return hasRoleExact(user, 'organizer');
}

/**
 * Check if user is an attendee
 */
export function isAttendee(user: User | null): boolean {
  return hasRoleExact(user, 'attendee');
}

/**
 * Check if user owns the resource
 */
export function isOwner(user: User | null, resourceUserId: string | number): boolean {
  if (!user) return false;
  return user.id === resourceUserId;
}

/**
 * Check if user belongs to the same tenant as the resource
 */
export function isSameTenant(user: User | null, resourceTenantId: string | number): boolean {
  if (!user) return false;

  const userTenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
  return userTenantId != null && userTenantId === resourceTenantId;
}

/**
 * Get user permissions based on role
 */
export function getUserPermissions(user: User | null): string[] {
  if (!user) return [];

  const rolePermissions: Record<string, string[]> = {
    superAdmin: ['*'], // Has all permissions
    admin: [
      'users:read',
      'users:write',
      'users:delete',
      'events:read',
      'events:write',
      'events:delete',
      'bookings:read',
      'bookings:write',
      'bookings:delete',
      'notifications:read',
      'notifications:write',
      'tenants:read',
      'dashboard:read',
    ],
    organizer: [
      'events:read',
      'events:write',
      'bookings:read',
      'bookings:write',
      'notifications:read',
      'dashboard:read',
    ],
    attendee: [
      'events:read',
      'bookings:read',
      'bookings:write', // Can book events
      'notifications:read',
      'notifications:write', // Can mark as read
    ],
  };

  return rolePermissions[user.role] || [];
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;

  const permissions = getUserPermissions(user);
  return permissions.includes(permission) || permissions.includes('*');
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null, permissions: string[]): boolean {
  if (!user) return false;

  const userPermissions = getUserPermissions(user);
  return permissions.some(permission =>
    userPermissions.includes(permission) || userPermissions.includes('*')
  );
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null, permissions: string[]): boolean {
  if (!user) return false;

  const userPermissions = getUserPermissions(user);
  return permissions.every(permission =>
    userPermissions.includes(permission) || userPermissions.includes('*')
  );
}

/**
 * Check if user can perform an action on a resource
 */
export function canPerformAction(
  user: User | null,
  action: string,
  resourceType: string,
  resourceUserId?: string | number,
  resourceTenantId?: string | number
): boolean {
  if (!user) return false;

  const permission = `${resourceType}:${action}`;

  // Super admin can do anything
  if (isSuperAdmin(user)) {
    return true;
  }

  // Check permission
  if (!hasPermission(user, permission)) {
    return false;
  }

  // For attendee role, check ownership
  if (isAttendee(user) && resourceUserId && !isOwner(user, resourceUserId)) {
    return false;
  }

  // For organizer/admin, check tenant membership if tenant ID is provided
  if ((isOrganizer(user) || isAdmin(user)) && resourceTenantId && !isSameTenant(user, resourceTenantId)) {
    return false;
  }

  return true;
}

/**
 * Require specific role (throws error if not met)
 */
export function requireRole(user: User | null, roles: string[]): void {
  if (!hasRole(user, roles)) {
    throw new Error(`Access denied. Required roles: ${roles.join(', ')}`);
  }
}

/**
 * Require specific permission (throws error if not met)
 */
export function requirePermission(user: User | null, permission: string): void {
  if (!hasPermission(user, permission)) {
    throw new Error(`Access denied. Required permission: ${permission}`);
  }
}

/**
 * Require ownership (throws error if not met)
 */
export function requireOwnership(user: User | null, resourceUserId: string | number, resourceName: string = 'resource'): void {
  if (!isOwner(user, resourceUserId)) {
    throw new Error(`Access denied. You can only access your own ${resourceName}`);
  }
}

/**
 * Require same tenant (throws error if not met)
 */
export function requireSameTenant(user: User | null, resourceTenantId: string | number): void {
  if (!isSameTenant(user, resourceTenantId)) {
    throw new Error('Access denied. Resource belongs to different tenant');
  }
}

/**
 * Get user's accessible tenant IDs
 */
export function getAccessibleTenantIds(user: User | null): (string | number)[] {
  if (!user) return [];

  if (isSuperAdmin(user)) {
    return ['*']; // Can access all tenants
  }

  const tenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
  return tenantId ? [tenantId] : [];
}

/**
 * Get user's role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(user: User | null): number {
  if (!user) return 0;

  const roleLevels: Record<string, number> = {
    attendee: 1,
    organizer: 2,
    admin: 3,
    superAdmin: 4,
  };

  return roleLevels[user.role] || 0;
}

/**
 * Check if user can manage another user
 */
export function canManageUser(manager: User | null, targetUser: User | null): boolean {
  if (!manager || !targetUser) return false;

  // Super admin can manage everyone
  if (isSuperAdmin(manager)) {
    return true;
  }

  // Admin can manage organizers and attendees in their tenant
  if (isAdmin(manager)) {
    const targetTenantId = typeof targetUser.tenant === 'object' ? targetUser.tenant?.id : targetUser.tenant;
    const sameTenant = targetTenantId != null && isSameTenant(manager, targetTenantId);
    return sameTenant && (isOrganizer(targetUser) || isAttendee(targetUser));
  }

  // Organizers can only manage attendees in their tenant
  if (isOrganizer(manager)) {
    const targetTenantId = typeof targetUser.tenant === 'object' ? targetUser.tenant?.id : targetUser.tenant;
    const sameTenant = targetTenantId != null && isSameTenant(manager, targetTenantId);
    return sameTenant && isAttendee(targetUser);
  }

  return false;
}