// src/collections/BookingLogs.ts
import type { CollectionConfig, Access, AccessArgs } from "payload";
import { readSameTenant, createForTenant } from "@/app/(payload)/access/tenant";
import { COLLECTIONS } from "@/constants/collections";
import { bookingLogsFields } from "@/schemas/fields/bookingLogsFields";

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
  slug: COLLECTIONS.BOOKING_LOGS,
  admin: {
    group: 'System Logs'
  },
  fields: bookingLogsFields,
  timestamps: true,
  access: {
    read: readSameTenant,
    create: createForTenant,
    update: bookingLogsUpdateAccess,
    delete: bookingLogsDeleteAccess,
  },
};