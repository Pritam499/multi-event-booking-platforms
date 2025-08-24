// // src/access/tenant.ts
// import type { Where, Access, PayloadRequest } from "payload";

// export const whereTenant = (req: PayloadRequest): Where | boolean => {
//   if (!req.user) return false;
  
//   // SuperAdmin has no tenant restrictions - can access everything
//   if ((req.user as any).role === 'superAdmin') {
//     return true;
//   }
  
//   // Regular users are restricted to their tenant
//   const userTenant = (req.user as any)?.tenant;
//   if (!userTenant) return false;
  
//   return {
//     tenant: { equals: userTenant },
//   };
// };

// // Read access - SuperAdmin sees all, others see only their tenant
// export const readSameTenant: Access = ({ req }) => {
//   return whereTenant(req);
// };

// // Create access - SuperAdmin can create anywhere, others need a tenant
// export const createForTenant: Access = ({ req }) => {
//   if (!req.user) return false;
  
//   // SuperAdmin can create anywhere
//   if ((req.user as any).role === 'superAdmin') {
//     return true;
//   }
  
//   // Regular users need a tenant to create
//   return !!(req.user as any).tenant;
// };

// // Update access - SuperAdmin full access, others only in their tenant
// export const updateSameTenant: Access = ({ req }) => {
//   return whereTenant(req);
// };

// // Delete access - SuperAdmin can delete anything, Admins only in their tenant
// export const deleteForTenant: Access = ({ req }) => {
//   if (!req.user) return false;
  
//   // SuperAdmin: full access
//   if ((req.user as any).role === 'superAdmin') {
//     return true;
//   }
  
//   // Tenant Admin: only in their tenant
//   if ((req.user as any).role === 'admin') {
//     return whereTenant(req);
//   }
  
//   // Organizers and Attendees cannot delete
//   return false;
// };

// src/access/tenant.ts
import type { Where, Access, PayloadRequest } from 'payload';

const getUserTenantId = (req: PayloadRequest): string | null => {
  const user = (req.user as any) ?? null;
  if (!user) return null;
  const t = user.tenant;
  if (!t) return null;
  // tenant may be a string id or an object { id: ..., ... }
  if (typeof t === 'string') return t;
  if (typeof t === 'object') return (t.id ?? t._id ?? null) as string | null;
  return null;
};

export const whereTenant = (req: PayloadRequest): Where | false | true => {
  if (!req.user) return false;

  // SuperAdmin has unrestricted access
  if ((req.user as any).role === 'superAdmin') return true;

  const tenantId = getUserTenantId(req);
  if (!tenantId) return false;

  return { tenant: { equals: tenantId } } as Where;
};

// Read access - SuperAdmin sees all, others see only their tenant
export const readSameTenant: Access = ({ req }) => {
  return whereTenant(req);
};

// Create access - SuperAdmin can create anywhere, others must belong to a tenant
export const createForTenant: Access = ({ req }) => {
  if (!req.user) return false;
  if ((req.user as any).role === 'superAdmin') return true;
  return !!getUserTenantId(req);
};

// Update access - SuperAdmin full access, others limited to their tenant
export const updateSameTenant: Access = ({ req }) => {
  return whereTenant(req);
};

// Delete access - SuperAdmin can delete anything, Admins only in their tenant
export const deleteForTenant: Access = ({ req }) => {
  if (!req.user) return false;
  if ((req.user as any).role === 'superAdmin') return true;
  // allow tenant admin to delete within tenant
  if ((req.user as any).role === 'admin') {
    return whereTenant(req);
  }
  return false;
};
