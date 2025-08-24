// src/access/bookingsAccess.ts
import type { Access, AccessArgs, Where } from "payload";

type Role = "superAdmin" | "admin" | "organizer" | "attendee";

interface User {
  id: string | number;
  role: Role;
  tenant: string | number;
  collection?: string;
}

const attendeeWhere = (user: User): Where => ({
  user: { equals: user.id },
  tenant: { equals: user.tenant },
});

export const bookingsReadAccess: Access = ({ req }: AccessArgs) => {
  const user = req.user as User | null;
  if (!user) return false;

  if (user.role === "superAdmin") return true;
  if (user.role === "attendee") return attendeeWhere(user);

  return { tenant: { equals: user.tenant } };
};

export const bookingsUpdateAccess: Access = ({ req }: AccessArgs) => {
  const user = req.user as User | null;
  if (!user) return false;

  if (user.role === "superAdmin") return true;
  if (user.role === "attendee") return attendeeWhere(user);

  return { tenant: { equals: user.tenant } };
};
