// Strict TypeScript interfaces for Users collection
export type UserRole = 'attendee' | 'organizer' | 'admin' | 'superAdmin';

export interface UserData {
  name: string;
  email: string;
  role: UserRole;
  tenant?: string | number;
}

export interface User extends UserData {
  id: string | number;
  createdAt: string;
  updatedAt: string;
}