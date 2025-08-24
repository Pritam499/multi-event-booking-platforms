// // src/collections/Users.ts
// import type {
//   CollectionConfig,
//   CollectionBeforeChangeHook,
//   Access,
//   Where,
// } from 'payload'

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
//   auth: true,
//   admin: {
//     useAsTitle: 'email',
//     group: 'Core',
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
//       relationTo: 'tenants',
//       required: false,
//       admin: {
//         condition: (data) => data?.role !== 'superAdmin',
//       },
//     },
//     {
//       name: 'tenantText',
//       label: 'Tenant (SuperAdmin only)',
//       type: 'text',
//       required: false,
//       admin: {
//         condition: (data) => data?.role === 'superAdmin',
//       },
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
// }


import type {
  CollectionConfig,
  CollectionBeforeChangeHook,
  Access,
  Where,
} from 'payload'

/**
 * Hook: attachTenantOnCreate
 */
const attachTenantOnCreate: CollectionBeforeChangeHook = async ({ req, data, operation }) => {
  if (operation !== 'create') return data;

  if ((req.user as any)?.role === 'superAdmin') {
    return data;
  }

  if (req.user?.tenant) {
    return { ...data, tenant: req.user.tenant };
  }

  if (!data?.tenant) {
    throw new Error('Tenant is required on signup or must be created via superAdmin.');
  }

  return data;
};

/**
 * Access Rules
 */
const usersReadAccess: Access = ({ req }) => {
  if (!req.user) return true // allow read during first-register

  if ((req.user as any).role === 'superAdmin') {
    return true
  }

  if ((req.user as any).role === 'attendee') {
    return {
      and: [
        { id: { equals: req.user.id } } as Where,
        { tenant: { equals: (req.user as any).tenant } } as Where,
      ],
    }
  }

  return { tenant: { equals: (req.user as any).tenant } } as Where
}

const usersCreateAccess: Access = ({ req }) => {
  if (!req.user) return true // allow first-register

  if ((req.user as any).role === 'superAdmin') return true
  if (
    (req.user as any).role === 'admin' ||
    (req.user as any).role === 'organizer'
  )
    return true

  return false
}

const usersUpdateAccess: Access = ({ req }) => {
  if (!req.user) return false

  if ((req.user as any).role === 'superAdmin') return true

  if ((req.user as any).role === 'attendee') {
    return {
      and: [
        { id: { equals: req.user.id } } as Where,
        { tenant: { equals: (req.user as any).tenant } } as Where,
      ],
    }
  }

  return { tenant: { equals: (req.user as any).tenant } } as Where
}

const usersDeleteAccess: Access = ({ req }) => {
  if (!req.user) return false
  if ((req.user as any).role === 'superAdmin') return true
  if ((req.user as any).role === 'admin') {
    return { tenant: { equals: (req.user as any).tenant } } as Where
  }
  return false
}

/**
 * Collection
 */
// export const Users: CollectionConfig = {
//   slug: 'users',
//   auth: {
//     // Explicitly enable auth with proper settings
//     useAPIKey: false,
//     tokenExpiration: 7200, // 2 hours
//     cookies: {
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
//     },

//     // Add this to handle the email field properly
//     verify: false, // Set to true if you want email verification
//     maxLoginAttempts: 5,
//     lockTime: 600000, // 10 minutes
//   },
//   admin: {
//     useAsTitle: 'email',
//     group: 'Core',
//     // Make sure default columns are shown
//     defaultColumns: ['email', 'name', 'role', 'tenant'],
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
//       // Important: This tells Payload to use this field for authentication
//       index: true,
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
//       relationTo: 'tenants',
//       required: false,
//       admin: {
//         condition: (data) => data?.role !== 'superAdmin',
//       },
//     },
//     {
//       name: 'tenantText',
//       label: 'Tenant (SuperAdmin only)',
//       type: 'text',
//       required: false,
//       admin: {
//         condition: (data) => data?.role === 'superAdmin',
//       },
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
// }

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // CRITICAL: Add these explicit auth settings
    useAPIKey: false,
    tokenExpiration: 7200,
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    },
    verify: false,
    maxLoginAttempts: 5,
    lockTime: 600000,
    // Remove the incorrect strategies configuration
  },
  admin: {
    useAsTitle: 'email',
    group: 'Core',
    defaultColumns: ['email', 'name', 'role'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true, // CRITICAL: Add index for authentication
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Attendee', value: 'attendee' },
        { label: 'Organizer', value: 'organizer' },
        { label: 'Admin', value: 'admin' },
        { label: 'Super Admin', value: 'superAdmin' },
      ],
      defaultValue: 'attendee',
      required: true,
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: false,
      admin: {
        condition: (data) => data?.role !== 'superAdmin',
      },
      filterOptions: () => ({}),
    },
  ],
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