// src/access/tenant.ts
import type { Where, Access, PayloadRequest } from "payload";

export const whereTenant = (req: PayloadRequest): Where | boolean => {
  if (!req.user) return false;
  
  // SuperAdmin has no tenant restrictions - can access everything
  if ((req.user as any).role === 'superAdmin') {
    return true;
  }
  
  // Regular users are restricted to their tenant
  const userTenant = (req.user as any)?.tenant;
  if (!userTenant) return false;
  
  return {
    tenant: { equals: userTenant },
  };
};

// Read access - SuperAdmin sees all, others see only their tenant
export const readSameTenant: Access = ({ req }) => {
  return whereTenant(req);
};

// Create access - SuperAdmin can create anywhere, others need a tenant
export const createForTenant: Access = ({ req }) => {
  if (!req.user) return false;
  
  // SuperAdmin can create anywhere
  if ((req.user as any).role === 'superAdmin') {
    return true;
  }
  
  // Regular users need a tenant to create
  return !!(req.user as any).tenant;
};

// Update access - SuperAdmin full access, others only in their tenant
export const updateSameTenant: Access = ({ req }) => {
  return whereTenant(req);
};

// Delete access - SuperAdmin can delete anything, Admins only in their tenant
export const deleteForTenant: Access = ({ req }) => {
  if (!req.user) return false;
  
  // SuperAdmin: full access
  if ((req.user as any).role === 'superAdmin') {
    return true;
  }
  
  // Tenant Admin: only in their tenant
  if ((req.user as any).role === 'admin') {
    return whereTenant(req);
  }
  
  // Organizers and Attendees cannot delete
  return false;
};