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
