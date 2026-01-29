// src/collections/Bookings.ts
import type { CollectionConfig } from "payload";
import {
  bookingBeforeChange,
  bookingAfterChange,
  bookingAfterDelete,
  bookingAfterOperation,
} from "@/app/(payload)/hooks/bookingHooks";
import { createForTenant, deleteForTenant } from "@/app/(payload)/access/tenant";
import { bookingsReadAccess, bookingsUpdateAccess } from "@/app/(payload)/access/bookingsAccess"; // if you extracted
import { COLLECTIONS } from "@/constants/collections";
import { bookingsFields } from "@/schemas/fields/bookingsFields";

export const Bookings: CollectionConfig = {
  slug: COLLECTIONS.BOOKINGS,
  admin: {
    useAsTitle: "id",
    group: "Event Management",
  },
  fields: bookingsFields,
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
