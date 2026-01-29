import { ApiError } from '@/middleware/errorHandler';
import { QueryBuilderFactory, type QueryResult } from '@/utils/queryBuilder';
import { DatabaseUtils } from '@/utils/database';
import { hasRole, isSuperAdmin } from '@/utils/rbac';
import { COLLECTIONS } from '@/constants/collections';
import type { User } from '@/payload-types';
import type { CollectionSlug } from 'payload';

export interface Tenant {
  id: string | number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string | number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tenant service for managing tenant data with proper isolation
 */
export class TenantService {
  /**
   * Find tenant by ID
   */
  static async findById(tenantId: string | number, user?: User): Promise<Tenant> {
    // For tenant queries, we use a special query builder that allows super admin access
    const queryBuilder = QueryBuilderFactory.tenants(user || { role: 'superAdmin', tenant: tenantId } as any);
    const tenant = await queryBuilder.findById(tenantId);
    if (!tenant) {
      throw ApiError.notFound('Tenant not found');
    }
    return tenant as Tenant;
  }

  /**
   * Find all tenants (super admin only)
   */
  static async findAll(user: User): Promise<QueryResult<Tenant>> {
    if (!isSuperAdmin(user)) {
      throw ApiError.forbidden('Only super admins can view all tenants');
    }

    const queryBuilder = QueryBuilderFactory.tenants(user);
    return queryBuilder.find({
      sort: 'name',
      user,
    });
  }

  /**
   * Find accessible tenants for a user
   */
  static async findAccessibleTenants(user: User): Promise<Tenant[]> {
    if (isSuperAdmin(user)) {
      // Super admin can access all tenants
      const result = await this.findAll(user);
      return result.docs as Tenant[];
    }

    // Regular users can only access their own tenant
    const tenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
    if (!tenantId) {
      return [];
    }

    try {
      const tenant = await this.findById(tenantId, user);
      return [tenant];
    } catch (error) {
      return [];
    }
  }

  /**
   * Create a new tenant (super admin only)
   */
  static async create(tenantData: { name: string; slug: string }, user: User): Promise<Tenant> {
    if (!isSuperAdmin(user)) {
      throw ApiError.forbidden('Only super admins can create tenants');
    }

    // Validate tenant data
    if (!tenantData.name || !tenantData.slug) {
      throw ApiError.badRequest('Tenant name and slug are required');
    }

    const queryBuilder = QueryBuilderFactory.tenants(user);
    const tenant = await queryBuilder.create(tenantData, user);
    return tenant as Tenant;
  }

  /**
   * Update tenant (super admin only)
   */
  static async update(tenantId: string | number, tenantData: Partial<{ name: string; slug: string }>, user: User): Promise<Tenant> {
    if (!isSuperAdmin(user)) {
      throw ApiError.forbidden('Only super admins can update tenants');
    }

    const queryBuilder = QueryBuilderFactory.tenants(user);
    const tenant = await queryBuilder.update(tenantId, tenantData, user);
    return tenant as Tenant;
  }

  /**
   * Delete tenant (super admin only)
   */
  static async delete(tenantId: string | number, user: User): Promise<void> {
    if (!isSuperAdmin(user)) {
      throw ApiError.forbidden('Only super admins can delete tenants');
    }

    const queryBuilder = QueryBuilderFactory.tenants(user);
    return queryBuilder.delete(tenantId, user);
  }

  /**
   * Get tenant statistics
   */
  static async getTenantStats(tenantId: string | number, user: User): Promise<{
    totalUsers: number;
    totalEvents: number;
    totalBookings: number;
    totalNotifications: number;
  }> {
    // Check if user can access this tenant
    if (!isSuperAdmin(user)) {
      const userTenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
      if (userTenantId !== tenantId) {
        throw ApiError.forbidden('Cannot access tenant statistics');
      }
    }

    const [users, events, bookings, notifications] = await Promise.all([
      DatabaseUtils.count(COLLECTIONS.USERS as CollectionSlug, { tenant: { equals: tenantId } }),
      DatabaseUtils.count(COLLECTIONS.EVENTS as CollectionSlug, { tenant: { equals: tenantId } }),
      DatabaseUtils.count(COLLECTIONS.BOOKINGS as CollectionSlug, { tenant: { equals: tenantId } }),
      DatabaseUtils.count(COLLECTIONS.NOTIFICATIONS as CollectionSlug, { tenant: { equals: tenantId } }),
    ]);

    return {
      totalUsers: users.totalDocs,
      totalEvents: events.totalDocs,
      totalBookings: bookings.totalDocs,
      totalNotifications: notifications.totalDocs,
    };
  }

  /**
   * Check if tenant slug is available
   */
  static async isSlugAvailable(slug: string, excludeTenantId?: string | number): Promise<boolean> {
    const where: any = { slug: { equals: slug } };

    if (excludeTenantId) {
      where.id = { not_equals: excludeTenantId };
    }

    const result = await DatabaseUtils.count(COLLECTIONS.TENANTS as CollectionSlug, where);
    return result.totalDocs === 0;
  }

  /**
   * Find tenant by slug
   */
  static async findBySlug(slug: string): Promise<Tenant | null> {
    const result = await DatabaseUtils.find(COLLECTIONS.TENANTS as CollectionSlug, {
      where: { slug: { equals: slug } },
      limit: 1,
    });

    return result.docs.length > 0 ? (result.docs[0] as Tenant) : null;
  }

  /**
   * Get user's tenant information
   */
  static async getUserTenant(user: User): Promise<Tenant | null> {
    const tenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
    if (!tenantId) {
      return null;
    }

    try {
      return await this.findById(tenantId);
    } catch (error) {
      return null;
    }
  }
}