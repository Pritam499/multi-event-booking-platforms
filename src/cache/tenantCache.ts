import { getTenantCacheConfig, type CacheStrategy } from '@/config/tenant';

/**
 * Tenant-aware caching layer with automatic cache invalidation
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tenantId: string | number;
  key: string;
}

export interface CacheOptions {
  tenantId: string | number;
  ttl?: number;
  tags?: string[];
  compress?: boolean;
}

/**
 * Cache key generator with tenant prefixes
 */
export class CacheKeyGenerator {
  static readonly SEPARATOR = ':';

  /**
   * Generate cache key with tenant prefix
   */
  static generate(
    tenantId: string | number,
    operation: string,
    ...params: (string | number | boolean)[]
  ): string {
    const tenantPrefix = `tenant${this.SEPARATOR}${tenantId}`;
    const operationKey = `${operation}${this.SEPARATOR}${params.join(this.SEPARATOR)}`;
    return `${tenantPrefix}${this.SEPARATOR}${operationKey}`;
  }

  /**
   * Generate user-specific cache key
   */
  static user(tenantId: string | number, userId: string | number, operation: string): string {
    return this.generate(tenantId, `user${this.SEPARATOR}${userId}`, operation);
  }

  /**
   * Generate collection-specific cache key
   */
  static collection(
    tenantId: string | number,
    collection: string,
    operation: string,
    ...params: (string | number | boolean)[]
  ): string {
    return this.generate(tenantId, `collection${this.SEPARATOR}${collection}`, operation, ...params);
  }

  /**
   * Generate query-specific cache key
   */
  static query(
    tenantId: string | number,
    collection: string,
    where: any,
    sort?: string,
    limit?: number,
    page?: number
  ): string {
    const queryHash = this.hashQuery(where, sort, limit, page);
    return this.generate(tenantId, `query${this.SEPARATOR}${collection}`, queryHash);
  }

  /**
   * Generate tenant-specific cache key
   */
  static tenant(tenantId: string | number, operation: string): string {
    return this.generate(tenantId, 'tenant', operation);
  }

  /**
   * Generate dashboard cache key
   */
  static dashboard(tenantId: string | number, userId: string | number): string {
    return this.generate(tenantId, `dashboard${this.SEPARATOR}${userId}`, 'data');
  }

  /**
   * Generate analytics cache key
   */
  static analytics(tenantId: string | number, type: string, dateRange?: string): string {
    return this.generate(tenantId, 'analytics', type, dateRange || 'all');
  }

  /**
   * Create hash of query parameters for cache key
   */
  private static hashQuery(where: any, sort?: string, limit?: number, page?: number): string {
    const queryString = JSON.stringify({
      where: this.normalizeQuery(where),
      sort,
      limit,
      page,
    });
    return this.simpleHash(queryString);
  }

  /**
   * Normalize query object for consistent hashing
   */
  private static normalizeQuery(query: any): any {
    if (!query) return {};

    // Sort object keys for consistent hashing
    const sorted: any = {};
    Object.keys(query).sort().forEach(key => {
      sorted[key] = query[key];
    });
    return sorted;
  }

  /**
   * Simple hash function for cache keys
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache key patterns for invalidation
   */
  static getInvalidationPatterns(tenantId: string | number): string[] {
    const tenantPrefix = `tenant${this.SEPARATOR}${tenantId}`;
    return [
      `${tenantPrefix}${this.SEPARATOR}*`, // All tenant data
      `${tenantPrefix}${this.SEPARATOR}collection${this.SEPARATOR}*`, // All collections
      `${tenantPrefix}${this.SEPARATOR}user${this.SEPARATOR}*`, // All user data
      `${tenantPrefix}${this.SEPARATOR}query${this.SEPARATOR}*`, // All queries
    ];
  }

  /**
   * Get collection-specific invalidation patterns
   */
  static getCollectionInvalidationPatterns(tenantId: string | number, collection: string): string[] {
    const tenantPrefix = `tenant${this.SEPARATOR}${tenantId}`;
    return [
      `${tenantPrefix}${this.SEPARATOR}collection${this.SEPARATOR}${collection}${this.SEPARATOR}*`,
      `${tenantPrefix}${this.SEPARATOR}query${this.SEPARATOR}${collection}${this.SEPARATOR}*`,
    ];
  }
}

/**
 * Abstract cache implementation
 */
export abstract class BaseCache {
  protected cacheConfig: CacheStrategy;

  constructor(cacheConfig: CacheStrategy) {
    this.cacheConfig = cacheConfig;
  }

  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  abstract delete(key: string): Promise<boolean>;
  abstract clear(pattern?: string): Promise<void>;
  abstract has(key: string): Promise<boolean>;
  abstract getStats(): Promise<CacheStats>;

  /**
   * Get cache key with tenant prefix
   */
  protected getTenantKey(key: string, tenantId: string | number): string {
    return `${this.cacheConfig.keyPrefix}:${tenantId}:${key}`;
  }
}

/**
 * In-memory cache implementation
 */
export class MemoryCache extends BaseCache {
  private cache = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || 300; // 5 minutes default
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
      tenantId: options?.tenantId || 0,
      key,
    };

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    // Simple pattern matching for memory cache
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async getStats(): Promise<CacheStats> {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    const validEntries = entries.filter(entry =>
      now - entry.timestamp <= entry.ttl * 1000
    );

    return {
      entries: this.cache.size,
      validEntries: validEntries.length,
      hitRate: 0, // Memory cache doesn't track hits
      totalSize: JSON.stringify(entries).length,
    };
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regex = new RegExp(
      pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
    );
    return regex.test(key);
  }
}

/**
 * Redis cache implementation (placeholder)
 * In production, implement with actual Redis client
 */
export class RedisCache extends BaseCache {
  // Placeholder implementation
  async get<T>(key: string): Promise<T | null> {
    // TODO: Implement Redis get
    console.log(`Redis GET: ${key}`);
    return null;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    // TODO: Implement Redis set
    console.log(`Redis SET: ${key}`);
  }

  async delete(key: string): Promise<boolean> {
    // TODO: Implement Redis delete
    console.log(`Redis DEL: ${key}`);
    return true;
  }

  async clear(pattern?: string): Promise<void> {
    // TODO: Implement Redis clear with pattern
    console.log(`Redis CLEAR: ${pattern || 'all'}`);
  }

  async has(key: string): Promise<boolean> {
    // TODO: Implement Redis exists
    console.log(`Redis EXISTS: ${key}`);
    return false;
  }

  async getStats(): Promise<CacheStats> {
    // TODO: Implement Redis stats
    return {
      entries: 0,
      validEntries: 0,
      hitRate: 0,
      totalSize: 0,
    };
  }
}

/**
 * Tenant cache manager with automatic cache invalidation
 */
export class TenantCache {
  private cache: BaseCache;
  private tenantId: string | number;

  constructor(tenantId: string | number) {
    this.tenantId = tenantId;
    const cacheConfig = getTenantCacheConfig(tenantId);

    switch (cacheConfig.type) {
      case 'redis':
        this.cache = new RedisCache(cacheConfig);
        break;
      case 'memory':
      default:
        this.cache = new MemoryCache(cacheConfig);
        break;
    }
  }

  /**
   * Get cached data
   */
  async get<T>(operation: string, ...params: (string | number | boolean)[]): Promise<T | null> {
    const key = CacheKeyGenerator.generate(this.tenantId, operation, ...params);
    return this.cache.get<T>(key);
  }

  /**
   * Set cached data
   */
  async set<T>(
    operation: string,
    data: T,
    params: (string | number | boolean)[] = [],
    ttl?: number
  ): Promise<void> {
    const key = CacheKeyGenerator.generate(this.tenantId, operation, ...params);
    await this.cache.set(key, data, {
      tenantId: this.tenantId,
      ttl,
    });
  }

  /**
   * Cache collection query results
   */
  async getCollectionQuery(collection: string, where: any, sort?: string, limit?: number, page?: number) {
    const key = CacheKeyGenerator.query(this.tenantId, collection, where, sort, limit, page);
    return this.cache.get(key);
  }

  /**
   * Set collection query cache
   */
  async setCollectionQuery(
    collection: string,
    data: any,
    where: any,
    sort?: string,
    limit?: number,
    page?: number,
    ttl?: number
  ) {
    const key = CacheKeyGenerator.query(this.tenantId, collection, where, sort, limit, page);
    await this.cache.set(key, data, {
      tenantId: this.tenantId,
      ttl,
      tags: [`collection:${collection}`, `tenant:${this.tenantId}`],
    });
  }

  /**
   * Cache user-specific data
   */
  async getUserData(userId: string | number, operation: string) {
    const key = CacheKeyGenerator.user(this.tenantId, userId, operation);
    return this.cache.get(key);
  }

  /**
   * Set user-specific cache
   */
  async setUserData(userId: string | number, operation: string, data: any, ttl?: number) {
    const key = CacheKeyGenerator.user(this.tenantId, userId, operation);
    await this.cache.set(key, data, {
      tenantId: this.tenantId,
      ttl,
      tags: [`user:${userId}`, `tenant:${this.tenantId}`],
    });
  }

  /**
   * Cache dashboard data
   */
  async getDashboardData(userId: string | number) {
    const key = CacheKeyGenerator.dashboard(this.tenantId, userId);
    return this.cache.get(key);
  }

  /**
   * Set dashboard cache
   */
  async setDashboardData(userId: string | number, data: any, ttl?: number) {
    const key = CacheKeyGenerator.dashboard(this.tenantId, userId);
    await this.cache.set(key, data, {
      tenantId: this.tenantId,
      ttl,
      tags: [`dashboard`, `user:${userId}`, `tenant:${this.tenantId}`],
    });
  }

  /**
   * Invalidate tenant cache
   */
  async invalidateTenantCache(): Promise<void> {
    const patterns = CacheKeyGenerator.getInvalidationPatterns(this.tenantId);
    for (const pattern of patterns) {
      await this.cache.clear(pattern);
    }
  }

  /**
   * Invalidate collection cache
   */
  async invalidateCollectionCache(collection: string): Promise<void> {
    const patterns = CacheKeyGenerator.getCollectionInvalidationPatterns(this.tenantId, collection);
    for (const pattern of patterns) {
      await this.cache.clear(pattern);
    }
  }

  /**
   * Invalidate user cache
   */
  async invalidateUserCache(userId: string | number): Promise<void> {
    const key = CacheKeyGenerator.user(this.tenantId, userId, '*');
    await this.cache.clear(key);
  }

  /**
   * Invalidate dashboard cache
   */
  async invalidateDashboardCache(): Promise<void> {
    const key = CacheKeyGenerator.dashboard(this.tenantId, '*');
    await this.cache.clear(key);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    return this.cache.getStats();
  }

  /**
   * Clear all tenant cache
   */
  async clear(): Promise<void> {
    await this.cache.clear();
  }
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  entries: number;
  validEntries: number;
  hitRate: number;
  totalSize: number;
}

/**
 * Global cache manager
 */
export class CacheManager {
  private static instances = new Map<string | number, TenantCache>();

  static getTenantCache(tenantId: string | number): TenantCache {
    const key = String(tenantId);
    if (!this.instances.has(key)) {
      this.instances.set(key, new TenantCache(tenantId));
    }
    return this.instances.get(key)!;
  }

  static async invalidateTenantCache(tenantId: string | number): Promise<void> {
    const cache = this.getTenantCache(tenantId);
    await cache.invalidateTenantCache();
  }

  static async invalidateCollectionCache(tenantId: string | number, collection: string): Promise<void> {
    const cache = this.getTenantCache(tenantId);
    await cache.invalidateCollectionCache(collection);
  }

  static async invalidateUserCache(tenantId: string | number, userId: string | number): Promise<void> {
    const cache = this.getTenantCache(tenantId);
    await cache.invalidateUserCache(userId);
  }

  static async clearAll(): Promise<void> {
    for (const cache of this.instances.values()) {
      await cache.clear();
    }
    this.instances.clear();
  }

  static getAllStats(): Promise<CacheStats[]> {
    const promises = Array.from(this.instances.values()).map(cache => cache.getStats());
    return Promise.all(promises);
  }
}

/**
 * Cache middleware for automatic cache management
 */
export function withCache<T extends any[]>(
  operation: (user: any, ...args: T) => Promise<any>,
  cacheKeyGenerator: (user: any, ...args: T) => string,
  options: {
    ttl?: number;
    invalidateOnError?: boolean;
    collection?: string;
  } = {}
) {
  return async (user: any, ...args: T): Promise<any> => {
    const cache = CacheManager.getTenantCache(user.tenant);
    const cacheKey = cacheKeyGenerator(user, ...args);

    try {
      // Try to get from cache first
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // Execute operation
      const result = await operation(user, ...args);

      // Cache the result
      await cache.set(cacheKey, result, [], options.ttl);

      return result;
    } catch (error) {
      if (options.invalidateOnError && options.collection) {
        await cache.invalidateCollectionCache(options.collection);
      }
      throw error;
    }
  };
}

/**
 * Export cache utilities
 */
export const TenantCacheUtils = {
  CacheKeyGenerator,
  CacheManager,
  withCache,
};