// // src/access/bookingsAccess.ts
// import type { Access, AccessArgs, Where } from "payload";

// type Role = "superAdmin" | "admin" | "organizer" | "attendee";

// interface User {
//   id: string | number;
//   role: Role;
//   tenant: string | number;
//   collection?: string;
// }

// const attendeeWhere = (user: User): Where => ({
//   user: { equals: user.id },
//   tenant: { equals: user.tenant },
// });

// export const bookingsReadAccess: Access = ({ req }: AccessArgs) => {
//   const user = req.user as User | null;
//   if (!user) return false;

//   if (user.role === "superAdmin") return true;
//   if (user.role === "attendee") return attendeeWhere(user);

//   return { tenant: { equals: user.tenant } };
// };

// export const bookingsUpdateAccess: Access = ({ req }: AccessArgs) => {
//   const user = req.user as User | null;
//   if (!user) return false;

//   if (user.role === "superAdmin") return true;
//   if (user.role === "attendee") return attendeeWhere(user);

//   return { tenant: { equals: user.tenant } };
// };


// src/access/bookingsAccess.ts
import type { Access, AccessArgs, Where } from "payload";
import { PayloadRequest } from "payload";

type Role = "superAdmin" | "admin" | "organizer" | "attendee";

interface User {
  id: string | number;
  role: Role;
  tenant?: string | { id?: string } | number;
  collection?: string;
}

const getTenantIdFromReq = (req: PayloadRequest): string | null => {
  const t = (req.user as any)?.tenant;
  if (!t) return null;
  if (typeof t === 'string') return t;
  return (t.id ?? t._id ?? null) as string | null;
};

const attendeeWhere = (user: User): Where => {
  const tenantId = typeof user.tenant === 'string' ? user.tenant : (user.tenant as any)?.id ?? null;
  return {
    user: { equals: user.id },
    ...(tenantId ? { tenant: { equals: tenantId } } : {}),
  } as Where;
};

export const bookingsReadAccess: Access = ({ req }: AccessArgs) => {
  const user = req.user as User | null;
  if (!user) return false;

  if (user.role === "superAdmin") return true;
  if (user.role === "attendee") return attendeeWhere(user);

  const tenantId = getTenantIdFromReq(req);
  if (!tenantId) return false;
  return { tenant: { equals: tenantId } } as Where;
};

export const bookingsUpdateAccess: Access = ({ req }: AccessArgs) => {
  const user = req.user as User | null;
  if (!user) return false;

  if (user.role === "superAdmin") return true;
  if (user.role === "attendee") return attendeeWhere(user);

  const tenantId = getTenantIdFromReq(req);
  if (!tenantId) return false;
  return { tenant: { equals: tenantId } } as Where;
};
