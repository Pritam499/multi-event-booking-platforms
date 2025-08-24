// src/collections/BookingLogs.ts
import type { CollectionConfig, Access, AccessArgs } from "payload";
import { readSameTenant, createForTenant } from "../access/tenant";

// Custom access for BookingLogs - logs should generally be immutable except for SuperAdmin
const bookingLogsUpdateAccess: Access = ({ req }: AccessArgs) => {
  if (!req.user) return false;
  
  // SuperAdmin can update any log (though logs should ideally be immutable)
  if ((req.user as any).role === 'superAdmin') {
    return true;
  }
  
  // Only Admins can update logs within their tenant
  if ((req.user as any).role === "admin") {
    return {
      tenant: { equals: (req.user as any).tenant }
    };
  }
  
  return false;
};

const bookingLogsDeleteAccess: Access = ({ req }: AccessArgs) => {
  if (!req.user) return false;
  
  // SuperAdmin can delete any log
  if ((req.user as any).role === 'superAdmin') {
    return true;
  }
  
  // Only Admins can delete logs within their tenant
  if ((req.user as any).role === "admin") {
    return {
      tenant: { equals: (req.user as any).tenant }
    };
  }
  
  return false;
};

export const BookingLogs: CollectionConfig = {
  slug: "booking-logs",
  admin: {
    group: 'System Logs'
  },
  fields: [
    { name: "booking", type: "relationship", relationTo: "bookings" },
    { name: "event", type: "relationship", relationTo: "events" },
    { name: "user", type: "relationship", relationTo: "users" },
    {
      name: "action",
      type: "select",
      options: [
        { label: "Create Request", value: "create_request" },
        { label: "Auto Waitlist", value: "auto_waitlist" },
        { label: "Auto Confirm", value: "auto_confirm" },
        { label: "Promote From Waitlist", value: "promote_from_waitlist" },
        { label: "Cancel Confirmed", value: "cancel_confirmed" },
      ],
      required: true,
    },
    { name: "note", type: "text" },
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
    update: bookingLogsUpdateAccess,
    delete: bookingLogsDeleteAccess,
  },
};