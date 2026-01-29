// src/collections/Users.ts
import type {
  CollectionConfig,
  CollectionBeforeChangeHook,
  Access,
  Where,
} from 'payload'
import { COLLECTIONS } from "@/constants/collections";
import { usersFields } from "@/schemas/fields/usersFields";

// /**
//  * Hook: attachTenantOnCreate
//  */
// const attachTenantOnCreate: CollectionBeforeChangeHook = async ({ req, data, operation }) => {
//   if (operation !== 'create') return data;

//   if ((req.user as any)?.role === 'superAdmin') {
//     return data;
//   }

//   if (req.user?.tenant) {
//     return { ...data, tenant: req.user.tenant };
//   }

//   if (!data?.tenant) {
//     throw new Error('Tenant is required on signup or must be created via superAdmin.');
//   }

//   return data;
// };

// /**
//  * Access Rules
//  */
// const usersReadAccess: Access = ({ req }) => {
//   if (!req.user) return true // allow read during first-register

//   if ((req.user as any).role === 'superAdmin') {
//     return true
//   }

//   if ((req.user as any).role === 'attendee') {
//     return {
//       and: [
//         { id: { equals: req.user.id } } as Where,
//         { tenant: { equals: (req.user as any).tenant } } as Where,
//       ],
//     }
//   }

//   return { tenant: { equals: (req.user as any).tenant } } as Where
// }

// const usersCreateAccess: Access = ({ req }) => {
//   if (!req.user) return true // allow first-register

//   if ((req.user as any).role === 'superAdmin') return true
//   if (
//     (req.user as any).role === 'admin' ||
//     (req.user as any).role === 'organizer'
//   )
//     return true

//   return false
// }

// const usersUpdateAccess: Access = ({ req }) => {
//   if (!req.user) return false

//   if ((req.user as any).role === 'superAdmin') return true

//   if ((req.user as any).role === 'attendee') {
//     return {
//       and: [
//         { id: { equals: req.user.id } } as Where,
//         { tenant: { equals: (req.user as any).tenant } } as Where,
//       ],
//     }
//   }

//   return { tenant: { equals: (req.user as any).tenant } } as Where
// }

// const usersDeleteAccess: Access = ({ req }) => {
//   if (!req.user) return false
//   if ((req.user as any).role === 'superAdmin') return true
//   if ((req.user as any).role === 'admin') {
//     return { tenant: { equals: (req.user as any).tenant } } as Where
//   }
//   return false
// }

// /**
//  * Collection
//  */

// export const Users: CollectionConfig = {
//   slug: 'users',
//   auth: {
//     // CRITICAL: Add these explicit auth settings
//     useAPIKey: false,
//     tokenExpiration: 7200,
//     cookies: {
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
//     },
//     verify: false,
//     maxLoginAttempts: 5,
//     lockTime: 600000,
//     // Remove the incorrect strategies configuration
//   },
//   admin: {
//     useAsTitle: 'email',
//     group: 'Core',
//     defaultColumns: ['email', 'name', 'role'],
//   },
//   fields: [
//     {
//       name: 'name',
//       type: 'text',
//       required: true,
//     },
//     {
//       name: 'email',
//       type: 'email',
//       required: true,
//       unique: true,
//       index: true, // CRITICAL: Add index for authentication
//       admin: {
//         position: 'sidebar',
//       },
//     },
//     {
//       name: 'role',
//       type: 'select',
//       options: [
//         { label: 'Attendee', value: 'attendee' },
//         { label: 'Organizer', value: 'organizer' },
//         { label: 'Admin', value: 'admin' },
//         { label: 'Super Admin', value: 'superAdmin' },
//       ],
//       defaultValue: 'attendee',
//       required: true,
//     },
//     {
//       name: 'tenant',
//       type: 'relationship',
//       relationTo: COLLECTIONS.TENANTS,
//       required: false,
//       admin: {
//         condition: (data) => data?.role !== 'superAdmin',
//       },
//       filterOptions: () => ({}),
//     },
//   ],
//   access: {
//     read: usersReadAccess,
//     create: usersCreateAccess,
//     update: usersUpdateAccess,
//     delete: usersDeleteAccess,
//   },
//   hooks: {
//     beforeChange: [attachTenantOnCreate],
//   },
//   timestamps: true,
// };




/**
 * Hook: attachTenantOnCreate
 */
const attachTenantOnCreate: CollectionBeforeChangeHook = async ({ req, data, operation }) => {
  if (operation !== 'create') return data;

  // If superAdmin creating, keep whatever is provided (superAdmin might create cross-tenant)
  if ((req.user as any)?.role === 'superAdmin') {
    return data;
  }

  // Normalize tenant id from req.user
  const userTenant = (req.user as any)?.tenant;
  let tenantId = null;
  if (typeof userTenant === 'string') tenantId = userTenant;
  else if (userTenant && typeof userTenant === 'object') tenantId = userTenant.id ?? userTenant._id;

  if (tenantId) {
    return { ...data, tenant: tenantId };
  }

  // If no tenant on user, require tenant provided in data
  if (!data?.tenant) {
    throw new Error('Tenant is required on signup or must be created via superAdmin.');
  }

  // ensure tenant is id not object:
  if (typeof data.tenant === 'object') {
    return { ...data, tenant: (data.tenant.id ?? data.tenant._id) };
  }

  return data;
};

/**
 * Access Rules
 */
const usersReadAccess: Access = ({ req }) => {
  // allow read for unauthenticated during first-register flows
  if (!req.user) return true;

  if ((req.user as any).role === 'superAdmin') {
    return true;
  }

  if ((req.user as any).role === 'attendee') {
    return {
      and: [
        { id: { equals: req.user.id } } as Where,
        { tenant: { equals: (req.user as any).tenant?.id ?? (req.user as any).tenant } } as Where,
      ],
    }
  }

  // admin & organizer: tenant-scoped
  return { tenant: { equals: (req.user as any).tenant?.id ?? (req.user as any).tenant } } as Where
}

const usersCreateAccess: Access = ({ req }) => {
  if (!req.user) return true // allow first-register

  if ((req.user as any).role === 'superAdmin') return true
  if (
    (req.user as any).role === 'admin' ||
    (req.user as any).role === 'organizer'
  ) return true

  return false
}

const usersUpdateAccess: Access = ({ req }) => {
  if (!req.user) return false

  if ((req.user as any).role === 'superAdmin') return true

  if ((req.user as any).role === 'attendee') {
    return {
      and: [
        { id: { equals: req.user.id } } as Where,
        { tenant: { equals: (req.user as any).tenant?.id ?? (req.user as any).tenant } } as Where,
      ],
    }
  }

  // admin & organizer: tenant-scoped updates
  return { tenant: { equals: (req.user as any).tenant?.id ?? (req.user as any).tenant } } as Where
}

const usersDeleteAccess: Access = ({ req }) => {
  if (!req.user) return false
  if ((req.user as any).role === 'superAdmin') return true
  if ((req.user as any).role === 'admin') {
    return { tenant: { equals: (req.user as any).tenant?.id ?? (req.user as any).tenant } } as Where
  }
  return false
}

/**
 * Collection
 */

export const Users: CollectionConfig = {
  slug: COLLECTIONS.USERS,
  auth: {
    useAPIKey: false,
    tokenExpiration: 7200,
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    },
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600000,
  },
  admin: {
    useAsTitle: 'email',
    group: 'Core',
    defaultColumns: ['email', 'name', 'role'],
  },
  fields: usersFields,
  access: {
    read: usersReadAccess,
    create: usersCreateAccess,
    update: usersUpdateAccess,
    delete: usersDeleteAccess,
  },
  hooks: {
    beforeChange: [attachTenantOnCreate],
  },
  timestamps: true,
};
