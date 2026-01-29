import payload from 'payload';
import {
  getTenantQueryConfig,
  getQueryOptimizationHints,
  type TenantQueryConfig,
  type QueryOptimizationHints
} from '@/config/tenant';
import { CacheManager } from '@/cache/tenantCache';
import { createTenantQuery } from '@/middleware/tenantIsolation';
import { COLLECTIONS } from '@/constants/collections';
import type { User } from '@/payload-types';
import type { CollectionSlug } from 'payload';

/**
 * Query builder wrapper with automatic tenant filtering, caching, and optimization
 */

export interface QueryOptions {
  where?: any;
  sort?: string;
  limit?: number;
  page?: number;
  depth?: number;
  user?: User;
  skipCache?: boolean;
  cacheTTL?: number;
  forceIndex?: string;
}

export interface QueryResult<T = any> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

/**
 * Tenant-aware query builder
 */
export class TenantQueryBuilder {
  private tenantConfig: TenantQueryConfig;
  private collection: CollectionSlug;
  private hints: QueryOptimizationHints;

  constructor(collection: string, user: User) {
    this.tenantConfig = getTenantQueryConfig(user);
    this.collection = collection as CollectionSlug;
    this.hints = getQueryOptimizationHints(this.tenantConfig.tenantId, collection, 'find');
  }

  /**
   * Build tenant-filtered query
   */
  private buildQuery(options: QueryOptions): any {
    const { where = {}, sort, limit, page, depth } = options;

    // Apply tenant filtering
    const tenantQuery = createTenantQuery(
      { id: 'temp', role: 'temp', tenant: this.tenantConfig.tenantId } as any,
      where,
      {
        tenantField: this.tenantConfig.tenantField,
        allowSuperAdmin: this.tenantConfig.allowSuperAdmin
      }
    );

    // Apply query limits
    const finalLimit = Math.min(
      limit || this.hints.maxRows,
      this.hints.maxRows
    );

    const query: any = {
      collection: this.collection,
      where: tenantQuery,
      sort: sort || '-createdAt',
      limit: finalLimit,
      page: page || 1,
      depth: depth || 1,
    };

    // Add optimization hints
    if (this.hints.useIndex && this.hints.forceIndex) {
      query.forceIndex = this.hints.forceIndex;
    }

    // Add timeout
    query.timeout = this.hints.queryTimeout;

    return query;
  }

  /**
   * Execute find query with caching
   */
  async find<T = any>(options: QueryOptions = {}): Promise<QueryResult<T>> {
    const { user, skipCache = false, cacheTTL } = options;

    if (!user) {
      throw new Error('User context required for tenant queries');
    }

    // Check cache first
    if (!skipCache && this.hints.cacheable) {
      const cache = CacheManager.getTenantCache(this.tenantConfig.tenantId);
      const cachedResult = await cache.getCollectionQuery(
        this.collection as string,
        options.where,
        options.sort,
        options.limit,
        options.page
      );

      if (cachedResult) {
        return cachedResult as QueryResult<T>;
      }
    }

    // Execute query
    const query = this.buildQuery(options);
    const result = await payload.find(query);

    // Cache result
    if (!skipCache && this.hints.cacheable) {
      const cache = CacheManager.getTenantCache(this.tenantConfig.tenantId);
      await cache.setCollectionQuery(
        this.collection as string,
        result,
        options.where,
        options.sort,
        options.limit,
        options.page,
        cacheTTL || this.hints.cacheTTL
      );
    }

    return result as QueryResult<T>;
  }

  /**
   * Execute count query
   */
  async count(options: QueryOptions = {}): Promise<{ totalDocs: number }> {
    const { user } = options;

    if (!user) {
      throw new Error('User context required for tenant queries');
    }

    const query = this.buildQuery(options);
    const result = await payload.count({
      collection: this.collection,
      where: query.where,
    });

    return result;
  }

  /**
   * Find single document by ID
   */
  async findById<T = any>(id: string | number, options: QueryOptions = {}): Promise<T | null> {
    const { user, skipCache = false, cacheTTL } = options;

    if (!user) {
      throw new Error('User context required for tenant queries');
    }

    // Check cache
    if (!skipCache && this.hints.cacheable) {
      const cache = CacheManager.getTenantCache(this.tenantConfig.tenantId);
      const cachedResult = await cache.get<T>(`findById:${this.collection}:${id}`);
      if (cachedResult) {
        return cachedResult;
      }
    }

    // Execute query with tenant filtering
    const tenantQuery = createTenantQuery(user, { id: { equals: id } });
    const result = await payload.find({
      collection: this.collection,
      where: tenantQuery,
      limit: 1,
      depth: options.depth || 1,
    });

    const doc = result.docs.length > 0 ? result.docs[0] : null;

    // Cache result
    if (!skipCache && this.hints.cacheable && doc) {
      const cache = CacheManager.getTenantCache(this.tenantConfig.tenantId);
      await cache.set(`findById:${this.collection}:${id}`, doc, [], cacheTTL || this.hints.cacheTTL);
    }

    return doc as T;
  }

  /**
   * Create document with tenant validation
   */
  async create<T = any>(data: any, user: User): Promise<T> {
    // Validate tenant data
    const tenantQuery = createTenantQuery(user, {}, {
      tenantField: this.tenantConfig.tenantField,
      allowSuperAdmin: this.tenantConfig.allowSuperAdmin
    });

    // Ensure data is scoped to tenant
    const tenantData = {
      ...data,
      [this.tenantConfig.tenantField]: this.tenantConfig.tenantId,
    };

    const result = await payload.create({
      collection: this.collection,
      data: tenantData,
      req: { user } as any,
    });

    // Invalidate cache
    const cache = CacheManager.getTenantCache(this.tenantConfig.tenantId);
    await cache.invalidateCollectionCache(this.collection as string);

    return result as T;
  }

  /**
   * Update document with tenant validation
   */
  async update<T = any>(
    id: string | number,
    data: any,
    user: User,
    options: QueryOptions = {}
  ): Promise<T> {
    // First check if document exists and user has access
    const existingDoc = await this.findById(id, { user, skipCache: true });
    if (!existingDoc) {
      throw new Error('Document not found or access denied');
    }

    const result = await payload.update({
      collection: this.collection,
      id,
      data,
      req: { user } as any,
    });

    // Invalidate cache
    const cache = CacheManager.getTenantCache(this.tenantConfig.tenantId);
    await cache.invalidateCollectionCache(this.collection as string);

    return result as T;
  }

  /**
   * Delete document with tenant validation
   */
  async delete(id: string | number, user: User): Promise<void> {
    // First check if document exists and user has access
    const existingDoc = await this.findById(id, { user, skipCache: true });
    if (!existingDoc) {
      throw new Error('Document not found or access denied');
    }

    await payload.delete({
      collection: this.collection,
      id,
      req: { user } as any,
    });

    // Invalidate cache
    const cache = CacheManager.getTenantCache(this.tenantConfig.tenantId);
    await cache.invalidateCollectionCache(this.collection as string);
  }
}

/**
 * Collection-specific query builders
 */
export class UsersQueryBuilder extends TenantQueryBuilder {
  constructor(user: User) {
    super(COLLECTIONS.USERS, user);
  }

  async findByEmail(email: string): Promise<any> {
    return this.find({
      where: { email: { equals: email } },
      limit: 1,
    });
  }

  async findByRole(role: string): Promise<QueryResult> {
    return this.find({
      where: { role: { equals: role } },
    });
  }
}

export class EventsQueryBuilder extends TenantQueryBuilder {
  constructor(user: User) {
    super(COLLECTIONS.EVENTS, user);
  }

  async findUpcoming(): Promise<QueryResult> {
    return this.find({
      where: {
        date: { greater_than: new Date().toISOString() },
      },
      sort: 'date',
    });
  }

  async findByOrganizer(organizerId: string | number): Promise<QueryResult> {
    return this.find({
      where: { organizer: { equals: organizerId } },
    });
  }
}

export class BookingsQueryBuilder extends TenantQueryBuilder {
  constructor(user: User) {
    super(COLLECTIONS.BOOKINGS, user);
  }

  async findByUser(userId: string | number): Promise<QueryResult> {
    return this.find({
      where: { user: { equals: userId } },
    });
  }

  async findByEvent(eventId: string | number): Promise<QueryResult> {
    return this.find({
      where: { event: { equals: eventId } },
    });
  }

  async findByStatus(status: string): Promise<QueryResult> {
    return this.find({
      where: { status: { equals: status } },
    });
  }

  async getEventStats(eventId: string | number): Promise<{ confirmed: number; waitlisted: number; canceled: number }> {
    const [confirmed, waitlisted, canceled] = await Promise.all([
      this.count({ where: { event: { equals: eventId }, status: { equals: 'confirmed' } } }),
      this.count({ where: { event: { equals: eventId }, status: { equals: 'waitlisted' } } }),
      this.count({ where: { event: { equals: eventId }, status: { equals: 'canceled' } } }),
    ]);

    return {
      confirmed: confirmed.totalDocs,
      waitlisted: waitlisted.totalDocs,
      canceled: canceled.totalDocs,
    };
  }
}

export class NotificationsQueryBuilder extends TenantQueryBuilder {
  constructor(user: User) {
    super(COLLECTIONS.NOTIFICATIONS, user);
  }

  async findUnreadByUser(userId: string | number): Promise<QueryResult> {
    return this.find({
      where: {
        user: { equals: userId },
        read: { equals: false },
      },
      sort: '-createdAt',
    });
  }

  async markAsRead(id: string | number, user: User): Promise<any> {
    return this.update(id, { read: true }, user);
  }
}

export class TenantsQueryBuilder extends TenantQueryBuilder {
  constructor(user: User) {
    super(COLLECTIONS.TENANTS, user);
  }

  async findBySlug(slug: string): Promise<any> {
    return this.find({
      where: { slug: { equals: slug } },
      limit: 1,
    });
  }
}

/**
 * Query builder factory
 */
export class QueryBuilderFactory {
  static create(collection: string, user: User): TenantQueryBuilder {
    switch (collection) {
      case COLLECTIONS.USERS:
        return new UsersQueryBuilder(user);
      case COLLECTIONS.EVENTS:
        return new EventsQueryBuilder(user);
      case COLLECTIONS.BOOKINGS:
        return new BookingsQueryBuilder(user);
      case COLLECTIONS.NOTIFICATIONS:
        return new NotificationsQueryBuilder(user);
      case COLLECTIONS.TENANTS:
        return new TenantsQueryBuilder(user);
      default:
        return new TenantQueryBuilder(collection, user);
    }
  }

  static users(user: User): UsersQueryBuilder {
    return new UsersQueryBuilder(user);
  }

  static events(user: User): EventsQueryBuilder {
    return new EventsQueryBuilder(user);
  }

  static bookings(user: User): BookingsQueryBuilder {
    return new BookingsQueryBuilder(user);
  }

  static notifications(user: User): NotificationsQueryBuilder {
    return new NotificationsQueryBuilder(user);
  }

  static tenants(user: User): TenantsQueryBuilder {
    return new TenantsQueryBuilder(user);
  }
}

/**
 * High-level query utilities
 */
export const QueryUtils = {
  /**
   * Execute query with automatic tenant filtering and caching
   */
  async executeQuery(
    collection: string,
    operation: 'find' | 'count' | 'create' | 'update' | 'delete',
    params: any,
    user: User
  ): Promise<any> {
    const queryBuilder = QueryBuilderFactory.create(collection, user);

    switch (operation) {
      case 'find':
        return queryBuilder.find(params);
      case 'count':
        return queryBuilder.count(params);
      case 'create':
        return queryBuilder.create(params.data, user);
      case 'update':
        return queryBuilder.update(params.id, params.data, user, params.options);
      case 'delete':
        return queryBuilder.delete(params.id, user);
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  },

  /**
   * Get cached query result
   */
  async getCachedQuery(collection: string, queryKey: string, user: User): Promise<any> {
    const cache = CacheManager.getTenantCache(getTenantQueryConfig(user).tenantId);
    return cache.get(queryKey);
  },

  /**
   * Set cached query result
   */
  async setCachedQuery(collection: string, queryKey: string, data: any, user: User, ttl?: number): Promise<void> {
    const cache = CacheManager.getTenantCache(getTenantQueryConfig(user).tenantId);
    await cache.set(queryKey, data, [], ttl);
  },

  /**
   * Invalidate collection cache
   */
  async invalidateCollection(collection: string, user: User): Promise<void> {
    const tenantId = getTenantQueryConfig(user).tenantId;
    await CacheManager.invalidateCollectionCache(tenantId, collection);
  },

  /**
   * Invalidate tenant cache
   */
  async invalidateTenant(user: User): Promise<void> {
    const tenantId = getTenantQueryConfig(user).tenantId;
    await CacheManager.invalidateTenantCache(tenantId);
  },
};