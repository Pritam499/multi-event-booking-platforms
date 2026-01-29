// src/collections/Tenants.ts
import type { CollectionConfig } from "payload";
import { COLLECTIONS } from "@/constants/collections";
import { tenantsFields } from "@/schemas/fields/tenantsFields";



const getTenantIdFromUser = (user: any) => {
  if (!user) return null;
  const t = user.tenant;
  if (!t) return null;
  if (typeof t === 'string') return t;
  return t.id ?? t._id ?? null;
};

export const Tenants: CollectionConfig = {
  slug: COLLECTIONS.TENANTS,
  admin: {
    useAsTitle: "name",
    group: 'Core'
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false;
      if ((req.user as any).role === 'superAdmin') return true;
      const tenantId = getTenantIdFromUser(req.user);
      if (!tenantId) return false;
      return { id: { equals: tenantId } };
    },
    create: ({ req }) => ((req.user as any)?.role === 'superAdmin'),
    update: ({ req }) => ((req.user as any)?.role === 'superAdmin'),
    delete: ({ req }) => ((req.user as any)?.role === 'superAdmin'),
  },
  fields: tenantsFields,
  timestamps: true,
};
