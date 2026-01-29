import type { User } from '@/payload-types';

/**
 * Tenant configuration and query optimization settings
 */

export interface TenantConfig {
  // Tenant identification
  id: string | number;
  slug: string;

  // Performance settings
  maxConcurrentQueries: number;
  queryTimeout: number; // in milliseconds
  cacheEnabled: boolean;
  cacheTTL: number; // in seconds

  // Feature flags
  features: {
    advancedAnalytics: boolean;
    bulkOperations: boolean;
    realTimeUpdates: boolean;
    apiRateLimiting: boolean;
  };

  // Database optimization
  indexes: TenantIndexConfig[];
  queryLimits: {
    default: number;
    max: number;
  };

  // Caching strategy
  cacheStrategy: CacheStrategy;

  // Rate limiting
  rateLimits: {
    queriesPerMinute: number;
    apiCallsPerMinute: number;
  };
}

export interface TenantIndexConfig {
  collection: string;
  fields: string[];
  unique?: boolean;
  sparse?: boolean;
}

export interface CacheStrategy {
  type: 'memory' | 'redis' | 'hybrid';
  keyPrefix: string;
  invalidateOnUpdate: boolean;
  compression: boolean;
}

/**
 * Default tenant configuration
 */
export const DEFAULT_TENANT_CONFIG: Omit<TenantConfig, 'id' | 'slug'> = {
  maxConcurrentQueries: 10,
  queryTimeout: 30000, // 30 seconds
  cacheEnabled: true,
  cacheTTL: 300, // 5 minutes

  features: {
    advancedAnalytics: false,
    bulkOperations: true,
    realTimeUpdates: false,
    apiRateLimiting: true,
  },

  indexes: [
    // Users collection
    { collection: 'users', fields: ['tenant', 'email'], unique: true },
    { collection: 'users', fields: ['tenant', 'role'] },
    { collection: 'users', fields: ['tenant', 'createdAt'] },

    // Events collection
    { collection: 'events', fields: ['tenant', 'date'] },
    { collection: 'events', fields: ['tenant', 'organizer'] },
    { collection: 'events', fields: ['tenant', 'createdAt'] },

    // Bookings collection
    { collection: 'bookings', fields: ['tenant', 'user'] },
    { collection: 'bookings', fields: ['tenant', 'event'] },
    { collection: 'bookings', fields: ['tenant', 'status'] },
    { collection: 'bookings', fields: ['tenant', 'createdAt'] },

    // Notifications collection
    { collection: 'notifications', fields: ['tenant', 'user'] },
    { collection: 'notifications', fields: ['tenant', 'read'] },
    { collection: 'notifications', fields: ['tenant', 'createdAt'] },

    // Booking Logs collection
    { collection: 'booking-logs', fields: ['tenant', 'event'] },
    { collection: 'booking-logs', fields: ['tenant', 'user'] },
    { collection: 'booking-logs', fields: ['tenant', 'createdAt'] },
  ],

  queryLimits: {
    default: 50,
    max: 1000,
  },

  cacheStrategy: {
    type: 'memory',
    keyPrefix: 'tenant',
    invalidateOnUpdate: true,
    compression: false,
  },

  rateLimits: {
    queriesPerMinute: 1000,
    apiCallsPerMinute: 500,
  },
};

/**
 * Tenant-specific configurations
 * In production, this would be loaded from database or configuration service
 */
const TENANT_CONFIGS: Record<string, Partial<TenantConfig>> = {
  // Premium tenant with enhanced features
  'premium-corp': {
    maxConcurrentQueries: 50,
    cacheEnabled: true,
    cacheTTL: 600, // 10 minutes
    features: {
      advancedAnalytics: true,
      bulkOperations: true,
      realTimeUpdates: true,
      apiRateLimiting: false,
    },
    rateLimits: {
      queriesPerMinute: 5000,
      apiCallsPerMinute: 2000,
    },
  },

  // Enterprise tenant
  'enterprise-corp': {
    maxConcurrentQueries: 100,
    cacheEnabled: true,
    cacheTTL: 1800, // 30 minutes
    features: {
      advancedAnalytics: true,
      bulkOperations: true,
      realTimeUpdates: true,
      apiRateLimiting: false,
    },
    rateLimits: {
      queriesPerMinute: 10000,
      apiCallsPerMinute: 5000,
    },
    cacheStrategy: {
      type: 'redis',
      keyPrefix: 'enterprise',
      invalidateOnUpdate: true,
      compression: true,
    },
  },
};

/**
 * Get tenant configuration
 */
export function getTenantConfig(tenantId: string | number): TenantConfig {
  const tenantIdStr = String(tenantId);
  const tenantSpecificConfig = TENANT_CONFIGS[tenantIdStr] || {};

  return {
    id: tenantId,
    slug: tenantIdStr,
    ...DEFAULT_TENANT_CONFIG,
    ...tenantSpecificConfig,
  };
}

/**
 * Get tenant configuration for user
 */
export function getTenantConfigForUser(user: User): TenantConfig {
  const tenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
  if (!tenantId) {
    throw new Error('User must belong to a tenant');
  }
  return getTenantConfig(tenantId);
}

/**
 * Check if tenant has feature enabled
 */
export function tenantHasFeature(tenantId: string | number, feature: keyof TenantConfig['features']): boolean {
  const config = getTenantConfig(tenantId);
  return config.features[feature];
}

/**
 * Get tenant query limits
 */
export function getTenantQueryLimits(tenantId: string | number) {
  const config = getTenantConfig(tenantId);
  return config.queryLimits;
}

/**
 * Get tenant cache configuration
 */
export function getTenantCacheConfig(tenantId: string | number): CacheStrategy {
  const config = getTenantConfig(tenantId);
  return config.cacheStrategy;
}

/**
 * Get tenant rate limits
 */
export function getTenantRateLimits(tenantId: string | number) {
  const config = getTenantConfig(tenantId);
  return config.rateLimits;
}

/**
 * Database query optimization hints for tenant
 */
export interface QueryOptimizationHints {
  useIndex: boolean;
  forceIndex?: string;
  queryTimeout: number;
  maxRows: number;
  cacheable: boolean;
  cacheTTL: number;
}

export function getQueryOptimizationHints(
  tenantId: string | number,
  collection: string,
  operation: 'find' | 'count' | 'create' | 'update' | 'delete'
): QueryOptimizationHints {
  const config = getTenantConfig(tenantId);

  const baseHints: QueryOptimizationHints = {
    useIndex: true,
    queryTimeout: config.queryTimeout,
    maxRows: config.queryLimits.max,
    cacheable: config.cacheEnabled && operation === 'find',
    cacheTTL: config.cacheTTL,
  };

  // Collection-specific optimizations
  switch (collection) {
    case 'users':
      if (operation === 'find') {
        baseHints.forceIndex = 'tenant_email_idx';
      }
      break;

    case 'events':
      if (operation === 'find') {
        baseHints.forceIndex = 'tenant_date_idx';
      }
      break;

    case 'bookings':
      if (operation === 'find') {
        baseHints.forceIndex = 'tenant_user_idx';
      }
      break;

    case 'notifications':
      if (operation === 'find') {
        baseHints.forceIndex = 'tenant_user_read_idx';
      }
      break;
  }

  return baseHints;
}

/**
 * Tenant query builder configuration
 */
export interface TenantQueryConfig {
  tenantId: string | number;
  tenantField: string;
  allowSuperAdmin: boolean;
  cacheEnabled: boolean;
  queryTimeout: number;
  maxConcurrentQueries: number;
}

export function getTenantQueryConfig(user: User): TenantQueryConfig {
  const tenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
  if (!tenantId) {
    throw new Error('User must belong to a tenant');
  }

  const config = getTenantConfig(tenantId);

  return {
    tenantId,
    tenantField: 'tenant',
    allowSuperAdmin: true, // Super admins can query across tenants
    cacheEnabled: config.cacheEnabled,
    queryTimeout: config.queryTimeout,
    maxConcurrentQueries: config.maxConcurrentQueries,
  };
}

/**
 * Tenant isolation levels
 */
export enum TenantIsolationLevel {
  STRICT = 'strict', // Complete isolation, no cross-tenant access
  RELAXED = 'relaxed', // Allow some cross-tenant operations with explicit permission
  NONE = 'none', // No isolation (for super admin operations)
}

export function getTenantIsolationLevel(user: User): TenantIsolationLevel {
  // Super admins have no isolation
  if (user.role === 'superAdmin') {
    return TenantIsolationLevel.NONE;
  }

  // Admin users have relaxed isolation (can access within tenant hierarchy)
  if (user.role === 'admin') {
    return TenantIsolationLevel.RELAXED;
  }

  // Regular users have strict isolation
  return TenantIsolationLevel.STRICT;
}

/**
 * Export configuration for use in other modules
 */
export const TenantConfiguration = {
  getTenantConfig,
  getTenantConfigForUser,
  tenantHasFeature,
  getTenantQueryLimits,
  getTenantCacheConfig,
  getTenantRateLimits,
  getQueryOptimizationHints,
  getTenantQueryConfig,
  getTenantIsolationLevel,
  DEFAULT_CONFIG: DEFAULT_TENANT_CONFIG,
};