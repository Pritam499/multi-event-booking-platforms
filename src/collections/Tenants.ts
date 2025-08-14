import type { CollectionConfig } from 'payload'
import { authenticated, tenantAdmin } from '@/access'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  labels: {
    singular: 'Tenant',
    plural: 'Tenants',
  },
  access: {
    // any authenticated user can see the tenant list (adjust if you want public)
    read: authenticated,
    // only tenant admins can create / update / delete tenants
    create: tenantAdmin,
    update: tenantAdmin,
    delete: tenantAdmin,
  },
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
  ],
  timestamps: true,
}
