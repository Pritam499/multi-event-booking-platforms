'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { TenantService } from '@/services/TenantService';
import type { User } from '@/payload-types';

/**
 * Tenant information interface
 */
export interface TenantInfo {
  id: string | number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tenant context state interface
 */
export interface TenantState {
  currentTenant: TenantInfo | null;
  accessibleTenants: TenantInfo[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Tenant context interface
 */
export interface TenantContextType extends TenantState {
  setCurrentTenant: (tenant: TenantInfo) => void;
  switchTenant: (tenantId: string | number) => Promise<void>;
  refreshTenants: () => Promise<void>;
  canAccessTenant: (tenantId: string | number) => boolean;
  getTenantById: (tenantId: string | number) => TenantInfo | null;
}

/**
 * Default tenant state
 */
const defaultTenantState: TenantState = {
  currentTenant: null,
  accessibleTenants: [],
  isLoading: true,
  error: null,
};

/**
 * Tenant context
 */
const TenantContext = createContext<TenantContextType | undefined>(undefined);

/**
 * Tenant provider props
 */
interface TenantProviderProps {
  children: ReactNode;
}

/**
 * Tenant Provider Component
 */
export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { user, isAuthenticated, hasRole } = useAuth();
  const [tenantState, setTenantState] = useState<TenantState>(defaultTenantState);

  /**
   * Load accessible tenants for the current user
   */
  const loadTenants = async (): Promise<void> => {
    if (!user || !isAuthenticated) {
      setTenantState({
        currentTenant: null,
        accessibleTenants: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setTenantState(prev => ({ ...prev, isLoading: true, error: null }));

      // Use TenantService to get accessible tenants
      const tenants = await TenantService.findAccessibleTenants(user);

      // Set current tenant (first accessible tenant or user's tenant)
      let currentTenant: TenantInfo | null = null;

      if (tenants.length > 0) {
        // If user has a tenant, use that as current
        const userTenantId = typeof user.tenant === 'object' ? user.tenant?.id : user.tenant;
        const userTenant = tenants.find(t => t.id === userTenantId);

        if (userTenant) {
          currentTenant = userTenant;
        } else {
          // Otherwise use the first accessible tenant
          currentTenant = tenants[0];
        }
      }

      setTenantState({
        currentTenant,
        accessibleTenants: tenants,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load tenants:', error);
      setTenantState({
        currentTenant: null,
        accessibleTenants: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load tenants',
      });
    }
  };

  /**
   * Set current tenant
   */
  const setCurrentTenant = (tenant: TenantInfo): void => {
    setTenantState(prev => ({
      ...prev,
      currentTenant: tenant,
    }));
  };

  /**
   * Switch to a different tenant
   */
  const switchTenant = async (tenantId: string | number): Promise<void> => {
    const tenant = tenantState.accessibleTenants.find(t => t.id === tenantId);

    if (!tenant) {
      throw new Error('Tenant not accessible');
    }

    setCurrentTenant(tenant);
  };

  /**
   * Refresh tenant data
   */
  const refreshTenants = async (): Promise<void> => {
    await loadTenants();
  };

  /**
   * Check if user can access a specific tenant
   */
  const canAccessTenant = (tenantId: string | number): boolean => {
    if (hasRole(['superAdmin'])) {
      return true;
    }

    return tenantState.accessibleTenants.some(tenant => tenant.id === tenantId);
  };

  /**
   * Get tenant by ID
   */
  const getTenantById = (tenantId: string | number): TenantInfo | null => {
    return tenantState.accessibleTenants.find(tenant => tenant.id === tenantId) || null;
  };

  /**
   * Load tenants when user authentication changes
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      loadTenants();
    } else {
      setTenantState({
        currentTenant: null,
        accessibleTenants: [],
        isLoading: false,
        error: null,
      });
    }
  }, [user, isAuthenticated]);

  const contextValue: TenantContextType = {
    ...tenantState,
    setCurrentTenant,
    switchTenant,
    refreshTenants,
    canAccessTenant,
    getTenantById,
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
};

/**
 * Custom hook to use tenant context
 */
export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

/**
 * Tenant guard component - only renders children if user has access to current tenant
 */
interface TenantGuardProps {
  children: ReactNode;
  tenantId?: string | number;
  fallback?: ReactNode;
}

export const TenantGuard: React.FC<TenantGuardProps> = ({
  children,
  tenantId,
  fallback
}) => {
  const { currentTenant, canAccessTenant } = useTenant();

  const targetTenantId = tenantId || currentTenant?.id;

  if (!targetTenantId || !canAccessTenant(targetTenantId)) {
    return fallback || <div>You don't have access to this tenant.</div>;
  }

  return <>{children}</>;
};

/**
 * Tenant selector component
 */
export const TenantSelector: React.FC = () => {
  const { currentTenant, accessibleTenants, switchTenant, isLoading } = useTenant();

  if (isLoading) {
    return <div>Loading tenants...</div>;
  }

  if (accessibleTenants.length <= 1) {
    return null; // No need to show selector if only one tenant
  }

  return (
    <select
      value={currentTenant?.id || ''}
      onChange={(e) => switchTenant(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-md"
    >
      {accessibleTenants.map((tenant) => (
        <option key={tenant.id} value={tenant.id}>
          {tenant.name}
        </option>
      ))}
    </select>
  );
};

/**
 * Higher-order component for tenant-aware components
 */
export const withTenant = <P extends object>(
  Component: React.ComponentType<P & { currentTenant: TenantInfo | null }>
) => {
  return (props: P) => {
    const { currentTenant } = useTenant();
    return <Component {...props} currentTenant={currentTenant} />;
  };
};

/**
 * Hook to get current tenant ID for API calls
 */
export const useTenantId = (): string | number | null => {
  const { currentTenant } = useTenant();
  return currentTenant?.id || null;
};

export default TenantContext;