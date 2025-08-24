// src/collections/Tenants.ts
import type { CollectionConfig } from "payload";

export const Tenants: CollectionConfig = {
  slug: "tenants",
  admin: {
    useAsTitle: "name",
    group: 'Core'
  },
  access: {
    // Read access: SuperAdmin can see all, others can only see their own tenant
    read: ({ req }) => {
      if (!req.user) return false;
      
      // SuperAdmin has access to all tenants
      if ((req.user as any).role === 'superAdmin') {
        return true;
      }
      
      // Regular users can only access their own tenant
      if ((req.user as any).tenant) {
        return {
          id: { equals: (req.user as any).tenant }
        };
      }
      
      return false;
    },
    
    // Create access: Only SuperAdmin can create new tenants
    create: ({ req }) => {
      return (req.user as any)?.role === 'superAdmin';
    },
    
    // Update access: Only SuperAdmin can update tenants
    update: ({ req }) => {
      return (req.user as any)?.role === 'superAdmin';
    },
    
    // Delete access: Only SuperAdmin can delete tenants
    delete: ({ req }) => {
      return (req.user as any)?.role === 'superAdmin';
    },
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
    },
  ],
  timestamps: true,
};