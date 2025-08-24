// src/collections/Notifications.ts
import type { CollectionConfig, Where, Access, AccessArgs } from "payload";
import { createForTenant, deleteForTenant } from "../access/tenant";

type Role = "superAdmin" | "admin" | "organizer" | "attendee";

interface User {
  id: string | number;
  role: Role;
  tenant: string | number;
  collection?: string;
}

const notificationsReadAccess: Access = ({ req }: AccessArgs) => {
  const user = req.user as User | null;
  if (!user) return false;

  if (user.role === "superAdmin") return true;

  if (user.role === "attendee") {
    return {
      user: { equals: user.id },
      tenant: { equals: user.tenant },
    } as Where;
  }

  // Organizer / Admin
  return {
    tenant: { equals: user.tenant },
  } as Where;
};

const notificationsUpdateAccess: Access = ({ req }: AccessArgs) => {
  const user = req.user as User | null;
  if (!user) return false;

  if (user.role === "superAdmin") return true;

  if (user.role === "attendee") {
    return {
      user: { equals: user.id },
      tenant: { equals: user.tenant },
    } as Where;
  }

  return {
    tenant: { equals: user.tenant },
  } as Where;
};


export const Notifications: CollectionConfig = {
  slug: "notifications",
  admin: {
    useAsTitle: "title",
    group: "System Logs",
  },
  fields: [
    {
      name: "user",
      type: "relationship",
      relationTo: "users",
      required: true,
    },
    {
      name: "booking",
      type: "relationship",
      relationTo: "bookings",
      required: false,
    },
    {
      name: "type",
      type: "select",
      options: [
        { label: "Booking Confirmed", value: "booking_confirmed" },
        { label: "Waitlisted", value: "waitlisted" },
        { label: "Waitlist Promoted", value: "waitlist_promoted" },
        { label: "Booking Canceled", value: "booking_canceled" },
      ],
      required: true,
    },
    { name: "title", type: "text" },
    { name: "message", type: "textarea" },
    { name: "read", type: "checkbox", defaultValue: false },
    {
      name: "tenant",
      type: "relationship",
      relationTo: "tenants",
      required: true,
    },
  ],
  timestamps: true,
  access: {
    read: notificationsReadAccess,
    create: createForTenant,
    update: notificationsUpdateAccess,
    delete: deleteForTenant,
  },
};
