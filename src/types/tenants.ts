// Strict TypeScript interfaces for Tenants collection
export interface TenantData {
  name: string;
  slug: string;
}

export interface Tenant extends TenantData {
  id: string | number;
  createdAt: string;
  updatedAt: string;
}