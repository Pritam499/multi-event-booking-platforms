// src/collections/Events.ts
import type { CollectionConfig, Access, AccessArgs, Where } from "payload";
import { readSameTenant, createForTenant, deleteForTenant } from "../access/tenant";

// Define our user type
type Role = "superAdmin" | "admin" | "organizer" | "attendee";

interface User {
  id: string | number;
  role: Role;
  tenant: string | number;
  collection?: string;
}

// Custom update access for Events
const eventsUpdateAccess: Access = ({ req }: AccessArgs) => {
  const user = req.user as User | null;
  if (!user) return false;

  // SuperAdmin → unrestricted
  if (user.role === "superAdmin") return true;

  // Admin → can update all events in their tenant
  if (user.role === "admin") {
    return { tenant: { equals: user.tenant } };
  }

  // Organizer → can update only their own events in their tenant
  if (user.role === "organizer") {
    // Just return a combined object (implicit AND)
    return {
      tenant: { equals: user.tenant },
      organizer: { equals: user.id },
    } as Where;
  }

  // Attendees cannot update events
  return false;
};

export const Events: CollectionConfig = {
  slug: "events",
  admin: {
    useAsTitle: "title",
    group: "Event Management",
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "description", type: "richText" },
    { name: "date", type: "date", required: true },
    { name: "capacity", type: "number", required: true, defaultValue: 1 },
    {
      name: "organizer",
      type: "relationship",
      relationTo: "users",
    },
    {
      name: "tenant",
      type: "relationship",
      relationTo: "tenants",
      required: true,
    },
  ],
  timestamps: true,
  access: {
    read: readSameTenant,
    create: createForTenant,
    update: eventsUpdateAccess, // ✅ use fixed version
    delete: deleteForTenant,
  },
};
