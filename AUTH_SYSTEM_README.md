# Authentication & Authorization System

This document describes the comprehensive authentication and authorization system implemented in the multi-tenant event booking platform.

## 🏗️ Architecture Overview

The system follows a layered architecture:

```
Frontend (React) → API Routes → Controllers → Services → Database
     ↓
AuthContext (State Management)
     ↓
Auth Middleware & RBAC
```

## 🔐 Authentication System (`/src/services/AuthService.ts`)

### Features
- JWT token generation and validation
- Refresh token support
- Secure token storage in localStorage
- Automatic token refresh
- Token expiration handling

### Key Methods

```typescript
// Generate tokens for user login
await AuthService.login(email, password)
// Returns: { user, accessToken, refreshToken }

// Validate JWT token
await AuthService.validateToken(token)
// Returns: User object

// Refresh access token
await AuthService.refreshToken(refreshToken)
// Returns: { accessToken, refreshToken }

// Extract token from request
AuthService.extractTokenFromRequest(request)
// Returns: token string or null
```

### Token Structure

```typescript
interface JWTPayloadExtended {
  userId: string | number;
  role: string;
  tenantId?: string | number;
  email: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}
```

## 🛡️ Authorization & RBAC (`/src/utils/rbac.ts`)

### Role Hierarchy
- **superAdmin**: Full system access
- **admin**: Tenant-wide administrative access
- **organizer**: Event management within tenant
- **attendee**: Basic booking access

### Permission Matrix

| Role       | bookings | events | notifications | users | tenants | dashboard |
|------------|----------|--------|---------------|-------|---------|-----------|
| superAdmin | ✅ CRUD  | ✅ CRUD| ✅ CRUD       | ✅ CRUD| ✅ CRUD | ✅ Read   |
| admin      | ✅ CRUD  | ✅ CRUD| ✅ CRUD       | ✅ CRUD| ✅ Read | ✅ Read   |
| organizer  | ✅ CRUD  | ✅ CRUD| ✅ CRUD       | ✅ Read| ✅ Read | ✅ Read   |
| attendee   | ✅ Read/Write | ✅ Read| ✅ Read/Write | ❌    | ❌     | ❌       |

### Key Functions

```typescript
// Role checking
hasRole(user, ['admin', 'organizer'])
isSuperAdmin(user)
isAdmin(user)

// Permission checking
hasPermission(user, 'events:write')
hasAnyPermission(user, ['bookings:read', 'events:read'])

// Resource access
canPerformAction(user, 'read', 'bookings', bookingId)
isOwner(user, resourceUserId)
isSameTenant(user, tenantId)
```

## 🎭 Permission Service (`/src/services/PermissionService.ts`)

Centralized permission checking service that eliminates duplicate authorization code.

### Usage

```typescript
// Check booking access
const check = PermissionService.checkBookingAccess(user, 'write');
if (!check.allowed) return check.response;

// Check dashboard access
const dashboardCheck = PermissionService.checkDashboardAccess(user);
if (!dashboardCheck.allowed) return dashboardCheck.response;

// Comprehensive access check
const accessCheck = PermissionService.checkAccess({
  user,
  action: 'write',
  resourceType: 'events',
  resourceTenantId: eventTenantId,
  requiredRoles: ['organizer']
});
```

## 🔄 Auth Context (`/src/contexts/AuthContext.tsx`)

React context provider for managing authentication state in the frontend.

### Provider Setup

```tsx
import { AuthProvider } from '@/contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}
```

### Hook Usage

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshAuth,
    hasRole,
    hasPermission
  } = useAuth();

  // Login
  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // Check permissions
  if (!hasRole(['organizer', 'admin'])) {
    return <div>Access denied</div>;
  }

  return <div>Welcome, {user?.name}!</div>;
}
```

### Auth Guards

```tsx
import { AuthGuard, withAuth } from '@/contexts/AuthContext';

// Component-based guard
function ProtectedComponent() {
  return (
    <AuthGuard requiredRoles={['organizer']}>
      <Dashboard />
    </AuthGuard>
  );
}

// HOC-based guard
const ProtectedDashboard = withAuth(Dashboard, ['admin']);
```

## 🛠️ Auth Middleware (`/src/middleware/auth.ts`)

Server-side authentication middleware for API routes.

### Usage

```typescript
import { requireAuth, requireRole, requireAuthAndTenant } from '@/middleware/auth';

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Require authentication
  const { user, response } = await requireAuth(request);
  if (response) return response;

  // Or require specific role
  const { user, response } = await requireRole(request, ['organizer']);
  if (response) return response;

  // Or require auth + tenant
  const { user, response } = await requireAuthAndTenant(request);
  if (response) return response;

  return ApiResponse.success(data);
});
```

## 🔧 API Integration

### Controllers with Auth

```typescript
export class BookingController {
  static async bookEvent(request: NextRequest) {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    // Use PermissionService for authorization
    const permissionCheck = PermissionService.checkBookingAccess(user, 'write');
    if (!permissionCheck.allowed) return permissionCheck.response;

    const booking = await BookingService.create(eventId, user);
    return ApiResponse.success(booking);
  }
}
```

### Frontend API Calls

```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

// Authenticated requests
const response = await fetch('/api/bookings', {
  headers: {
    'Authorization': `JWT ${accessToken}`
  }
});
```

## 🔒 Security Features

- **JWT with HS256**: Secure token signing
- **Refresh Tokens**: Automatic token renewal
- **Role-Based Access**: Granular permission control
- **Tenant Isolation**: Multi-tenant data separation
- **Token Expiration**: Automatic cleanup of expired tokens
- **Secure Storage**: localStorage with automatic cleanup

## 🚀 Best Practices

1. **Always check permissions** before performing actions
2. **Use AuthGuard/AuthContext** for frontend protection
3. **Apply middleware consistently** to all protected routes
4. **Handle token expiration** gracefully with refresh logic
5. **Validate tenant access** for multi-tenant operations
6. **Log security events** for audit trails

## 🔧 Environment Variables

```env
PAYLOAD_SECRET=your-super-secret-jwt-key
JWT_SECRET=alternative-jwt-secret
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout

### Protected Resources
- `GET /api/bookings` - List user bookings
- `POST /api/bookings` - Create booking
- `GET /api/dashboard` - Dashboard data
- `GET /api/notifications` - User notifications

All endpoints require proper authentication and authorization based on user roles and permissions.