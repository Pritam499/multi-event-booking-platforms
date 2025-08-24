// // src/collections/Bookings.ts
// import type { CollectionConfig, Access, AccessArgs, Where } from "payload";
// import {
//   bookingBeforeChange,
//   bookingAfterChange,
//   bookingAfterDelete,
// } from "../hooks/bookingHooks";
// import { createForTenant, deleteForTenant } from "../access/tenant";

// // keep Role as union
// type Role = "superAdmin" | "admin" | "organizer" | "attendee";

// // Payload's req.user includes collection + id:number|string
// interface User {
//   id: string | number;
//   role: Role;
//   tenant: string | number;
//   collection?: string;
// }

// // helper: attendee constraint
// const attendeeWhere = (user: User): Where => ({
//   user: { equals: user.id },
//   tenant: { equals: user.tenant },
// });

// // ----------------------
// // READ ACCESS
// // ----------------------
// const bookingsReadAccess: Access = ({ req }: AccessArgs) => {
//   const user = req.user as User | null;
//   if (!user) return false;

//   if (user.role === "superAdmin") return true;

//   if (user.role === "attendee") {
//     return attendeeWhere(user);
//   }

//   // organizer / admin
//   return { tenant: { equals: user.tenant } };
// };

// // ----------------------
// // UPDATE ACCESS
// // ----------------------
// const bookingsUpdateAccess: Access = ({ req }: AccessArgs) => {
//   const user = req.user as User | null;
//   if (!user) return false;

//   if (user.role === "superAdmin") return true;

//   if (user.role === "attendee") {
//     return attendeeWhere(user);
//   }

//   return { tenant: { equals: user.tenant } };
// };

// // ----------------------
// // COLLECTION CONFIG
// // ----------------------
// export const Bookings: CollectionConfig = {
//   slug: "bookings",
//   admin: {
//     useAsTitle: "id",
//     group: "Event Management",
//   },
//   fields: [
//     {
//       name: "event",
//       type: "relationship",
//       relationTo: "events",
//       required: true,
//     },
//     {
//       name: "user",
//       type: "relationship",
//       relationTo: "users",
//       required: true,
//     },
//     {
//       name: "status",
//       type: "select",
//       options: [
//         { label: "Confirmed", value: "confirmed" },
//         { label: "Waitlisted", value: "waitlisted" },
//         { label: "Canceled", value: "canceled" },
//       ],
//       required: true,
//       defaultValue: "waitlisted",
//     },
//     {
//       name: "tenant",
//       type: "relationship",
//       relationTo: "tenants",
//       required: true,
//     },
//   ],
//   timestamps: true,
//   hooks: {
//     beforeChange: [bookingBeforeChange],
//     afterChange: [bookingAfterChange],
//     afterDelete: [bookingAfterDelete],
//   },
//   access: {
//     read: bookingsReadAccess,
//     create: createForTenant,
//     update: bookingsUpdateAccess,
//     delete: deleteForTenant,
//   },
// };


// src/collections/Bookings.ts
import type { CollectionConfig } from "payload";
import {
  bookingBeforeChange,
  bookingAfterChange,
  bookingAfterDelete,
  bookingAfterOperation,
} from "../hooks/bookingHooks";
import { createForTenant, deleteForTenant } from "../access/tenant";
import { bookingsReadAccess, bookingsUpdateAccess } from "../access/bookingsAccess"; // if you extracted

export const Bookings: CollectionConfig = {
  slug: "bookings",
  admin: {
    useAsTitle: "id",
    group: "Event Management",
  },
  fields: [
    { name: "event", type: "relationship", relationTo: "events", required: true },
    { name: "user", type: "relationship", relationTo: "users", required: true },
    {
      name: "status",
      type: "select",
      options: [
        { label: "Confirmed", value: "confirmed" },
        { label: "Waitlisted", value: "waitlisted" },
        { label: "Canceled", value: "canceled" },
      ],
      required: true,
      defaultValue: "waitlisted",
    },
    { name: "tenant", type: "relationship", relationTo: "tenants", required: true },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [bookingBeforeChange],
    afterChange: [bookingAfterChange, ],
    afterDelete: [bookingAfterDelete],
  },
  access: {
    read: bookingsReadAccess,
    create: createForTenant,
    update: bookingsUpdateAccess,
    delete: deleteForTenant,
  },
};
