# Multi-Tenant Isolation System

This document describes the comprehensive multi-tenant isolation system implemented across the entire application.

## 🏢 Architecture Overview

The system ensures complete data isolation between tenants while maintaining security and performance:

```
Frontend (TenantContext) → API Routes → Controllers → Services → Database
       ↓
Tenant Isolation Middleware
       ↓
RBAC & Permission Checks
```

## 🛡️ Tenant Isolation Middleware (`/src/middleware/tenantIsolation.ts`)

### Core Functions

#### **`withTenantIsolation()`**
- Ensures all requests are tenant-scoped
- Automatically applies tenant filtering
- Handles authentication and tenant validation

```typescript
export async function withTenantIsolation(
  request: NextRequest,
  handler: (user: User, tenantId: string | number) => Promise<NextResponse>
): Promise<NextResponse>
```

#### **`requireTenantAccess()`**
- Validates tenant access permissions
- Supports cross-tenant access for super admins
- Handles tenant membership verification

#### **`createTenantQuery()`**
- Automatically adds tenant filtering to database queries
- Respects super admin access privileges
- Prevents data leakage between tenants

```typescript
export function createTenantQuery(
  user: User,
  baseWhere: any = {},
  options: {
    allowSuperAdmin?: boolean;
    tenantField?: string;
  } = {}
): any
```

#### **`validateTenantData()`**
- Ensures data being created/updated belongs to correct tenant
- Automatically sets tenant ID for non-super-admin users
- Prevents cross-tenant data manipulation

## 🎭 Tenant Context Provider (`/src/contexts/TenantContext.tsx`)

### State Management

```typescript
interface TenantState {
  currentTenant: TenantInfo | null;
  accessibleTenants: TenantInfo[];
  isLoading: boolean;
  error: string | null;
}
```

### Key Features

#### **Automatic Tenant Loading**
- Loads accessible tenants based on user role
- Super admins see all tenants, regular users see their tenant only
- Handles authentication state changes

#### **Tenant Switching**
```typescript
const { switchTenant, currentTenant } = useTenant();
await switchTenant(tenantId);
```

#### **Access Control**
```typescript
const { canAccessTenant } = useTenant();
if (canAccessTenant(tenantId)) {
  // Access granted
}
```

### Components

#### **TenantGuard**
```tsx
<TenantGuard tenantId={tenantId}>
  <TenantSpecificContent />
</TenantGuard>
```

#### **TenantSelector**
```tsx
<TenantSelector /> // Automatically shows accessible tenants
```

## 🏢 Tenant Service (`/src/services/TenantService.ts`)

### Core Operations

#### **Tenant CRUD**
```typescript
// Find tenant by ID
await TenantService.findById(tenantId)

// Find accessible tenants
await TenantService.findAccessibleTenants(user)

// Create tenant (super admin only)
await TenantService.create({ name, slug }, user)

// Update tenant (super admin only)
await TenantService.update(tenantId, { name, slug }, user)
```

#### **Tenant Validation**
```typescript
// Check slug availability
await TenantService.isSlugAvailable(slug, excludeTenantId)

// Find by slug
await TenantService.findBySlug(slug)

// Get user tenant
await TenantService.getUserTenant(user)
```

#### **Tenant Statistics**
```typescript
await TenantService.getTenantStats(tenantId, user)
// Returns: { totalUsers, totalEvents, totalBookings, totalNotifications }
```

## 🔒 Security Implementation

### Database Layer Security

All database queries automatically include tenant filtering:

```typescript
// Before (insecure)
payload.find({ collection: 'events' })

// After (secure)
const tenantQuery = createTenantQuery(user, {}, { tenantField: 'tenant' });
payload.find({
  collection: 'events',
  where: tenantQuery
});
```

### Service Layer Isolation

All services now accept user context and apply tenant filtering:

```typescript
// EventService
await EventService.findByTenant(user) // Automatically scoped

// BookingService
await BookingService.findByUser(user) // Tenant-aware

// NotificationService
await NotificationService.findUnreadByUser(user) // Scoped to tenant
```

### API Route Protection

All routes use tenant isolation middleware:

```typescript
export const GET = withErrorHandler(async (request: NextRequest) => {
  return withTenantIsolation(request, async (user, tenantId) => {
    // Handler has guaranteed tenant context
    const data = await Service.getData(user, tenantId);
    return ApiResponse.success(data);
  });
});
```

## 🎯 Permission Integration

### RBAC with Tenant Awareness

```typescript
// Check tenant-specific permissions
PermissionService.checkEventAccess(user, 'write', eventTenantId)
PermissionService.checkBookingAccess(user, 'read')
PermissionService.checkDashboardAccess(user)
```

### Tenant-Aware Role Checks

```typescript
// Super admin bypasses tenant restrictions
if (isSuperAdmin(user)) {
  return { allowed: true };
}

// Regular users restricted to their tenant
const userTenantId = getTenantId(user);
if (resourceTenantId !== userTenantId) {
  return { allowed: false };
}
```

## 🚀 Usage Examples

### Frontend Integration

```tsx
// App.tsx
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <YourApp />
      </TenantProvider>
    </AuthProvider>
  );
}

// Component usage
function Dashboard() {
  const { user } = useAuth();
  const { currentTenant, accessibleTenants } = useTenant();

  return (
    <div>
      <h1>{currentTenant?.name} Dashboard</h1>
      {/* Tenant-specific content */}
    </div>
  );
}
```

### API Route Implementation

```typescript
// /api/events/route.ts
export const GET = withErrorHandler(async (request: NextRequest) => {
  return withTenantIsolation(request, async (user, tenantId) => {
    const events = await EventService.findByTenant(user);
    return ApiResponse.success(events);
  });
});
```

### Service Implementation

```typescript
// EventService.ts
export class EventService {
  static async findByTenant(user: User): Promise<Event[]> {
    const tenantQuery = createTenantQuery(user, {}, { tenantField: 'tenant' });

    const result = await DatabaseUtils.find(COLLECTIONS.EVENTS, {
      where: tenantQuery,
      sort: 'date',
    });

    return result.docs as Event[];
  }
}
```

## 🔧 Configuration

### Environment Variables

```env
PAYLOAD_SECRET=your-jwt-secret
```

### Tenant Field Convention

All collections use `tenant` field for multi-tenancy:

```typescript
{
  name: 'tenant',
  type: 'relationship',
  relationTo: 'tenants',
  required: true,
}
```

## 📊 Benefits Achieved

### Security
- ✅ Complete data isolation between tenants
- ✅ Automatic tenant filtering on all queries
- ✅ Prevention of cross-tenant data access
- ✅ Role-based tenant access control

### Scalability
- ✅ Efficient tenant-scoped queries
- ✅ Minimal performance overhead
- ✅ Horizontal scaling support
- ✅ Database-level isolation

### Maintainability
- ✅ Centralized tenant logic
- ✅ Consistent API patterns
- ✅ Type-safe implementations
- ✅ Clear separation of concerns

### Developer Experience
- ✅ Automatic tenant context
- ✅ Intuitive permission checks
- ✅ React integration
- ✅ Comprehensive error handling

## 🔍 Monitoring & Audit

The system provides tenant-aware logging:

```typescript
console.log(`User ${user.id} accessed tenant ${tenantId}`);
// Output: User 123 accessed tenant abc-corp
```

All database operations include tenant context for audit trails and debugging.

## 🚨 Security Considerations

1. **Super Admin Access**: Carefully control super admin accounts
2. **Tenant Creation**: Only super admins can create tenants
3. **Data Validation**: All tenant IDs validated before use
4. **API Security**: All endpoints protected with tenant isolation
5. **Frontend Security**: Tenant context validated on client-side

The multi-tenant isolation system ensures complete data security and separation while maintaining usability and performance across the entire application! 🛡️🏢