// src/collections/Notifications.ts
import type { CollectionConfig, Where, Access, AccessArgs } from "payload";
import { createForTenant, deleteForTenant } from "@/app/(payload)/access/tenant";
import { COLLECTIONS } from "@/constants/collections";
import { notificationsFields } from "@/schemas/fields/notificationsFields";

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
  slug: COLLECTIONS.NOTIFICATIONS,
  admin: {
    useAsTitle: "title",
    group: "System Logs",
  },
  fields: notificationsFields,
  timestamps: true,
  access: {
    read: notificationsReadAccess,
    create: createForTenant,
    update: notificationsUpdateAccess,
    delete: deleteForTenant,
  },
};
