'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthService, JWTPayloadExtended } from '@/services/AuthService';
import type { User } from '@/payload-types';

/**
 * Authentication state interface
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * Authentication context interface
 */
export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateUser: (user: User) => void;
  hasRole: (roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

/**
 * Default auth state
 */
const defaultAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,
  refreshToken: null,
};

/**
 * Auth context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);

  /**
   * Load authentication state from localStorage on mount
   */
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (accessToken && !AuthService.isTokenExpired(accessToken)) {
          // Try to validate token and get user
          try {
            const user = await AuthService.validateToken(accessToken);
            setAuthState({
              user,
              isAuthenticated: true,
              isLoading: false,
              accessToken,
              refreshToken,
            });
          } catch (error) {
            // Token is invalid, try refresh
            if (refreshToken && !AuthService.isTokenExpired(refreshToken)) {
              await refreshAuth();
            } else {
              clearAuthState();
            }
          }
        } else if (refreshToken && !AuthService.isTokenExpired(refreshToken)) {
          // Try to refresh tokens
          await refreshAuth();
        } else {
          clearAuthState();
        }
      } catch (error) {
        console.error('Failed to load auth state:', error);
        clearAuthState();
      }
    };

    loadAuthState();
  }, []);

  /**
   * Clear authentication state
   */
  const clearAuthState = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      refreshToken: null,
    });
  };

  /**
   * Login user
   */
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const { user, accessToken, refreshToken } = await AuthService.login(email, password);

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  /**
   * Logout user
   */
  const logout = async (): Promise<void> => {
    try {
      if (authState.accessToken) {
        await AuthService.logout(authState.accessToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthState();
    }
  };

  /**
   * Refresh authentication tokens
   */
  const refreshAuth = async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshToken(refreshToken);

      // Update stored tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      // Get updated user data
      const user = await AuthService.validateToken(accessToken);

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuthState();
      throw error;
    }
  };

  /**
   * Update user data
   */
  const updateUser = (user: User): void => {
    setAuthState(prev => ({
      ...prev,
      user,
    }));
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasRole = (roles: string[]): boolean => {
    if (!authState.user) return false;
    return roles.includes(authState.user.role);
  };

  /**
   * Check if user has specific permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!authState.user) return false;

    // Import the permission checking logic
    const { getUserPermissions } = require('@/utils/rbac');
    const userPermissions = getUserPermissions(authState.user);
    return userPermissions.includes(permission) || userPermissions.includes('*');
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshAuth,
    updateUser,
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Higher-order component for protected routes
 */
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: string[]
) => {
  return (props: P) => {
    const { isAuthenticated, isLoading, hasRole } = useAuth();

    if (isLoading) {
      return <div>Loading...</div>; // Or a proper loading component
    }

    if (!isAuthenticated) {
      return <div>Please log in to access this page.</div>; // Or redirect to login
    }

    if (requiredRoles && !hasRole(requiredRoles)) {
      return <div>You don't have permission to access this page.</div>; // Or show access denied
    }

    return <Component {...props} />;
  };
};

/**
 * Auth guard component
 */
interface AuthGuardProps {
  children: ReactNode;
  requiredRoles?: string[];
  fallback?: ReactNode;
  loading?: ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRoles,
  fallback,
  loading
}) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  if (isLoading) {
    return loading || <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return fallback || <div>Please log in to access this content.</div>;
  }

  if (requiredRoles && !hasRole(requiredRoles)) {
    return fallback || <div>You don't have permission to access this content.</div>;
  }

  return <>{children}</>;
};

/**
 * Example usage:
 *
 * import { useAuth } from '@/contexts/AuthContext';
 *
 * function MyComponent() {
 *   const { user, isAuthenticated, login, logout, hasRole } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <LoginForm onLogin={login} />;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>Welcome, {user?.name}!</h1>
 *       {hasRole(['admin']) && <AdminPanel />}
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 *
 * // Using AuthGuard
 * function ProtectedPage() {
 *   return (
 *     <AuthGuard requiredRoles={['organizer']}>
 *       <DashboardContent />
 *     </AuthGuard>
 *   );
 * }
 */

export default AuthContext;