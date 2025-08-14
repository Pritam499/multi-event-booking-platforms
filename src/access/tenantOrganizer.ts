import type { Access, AccessArgs } from 'payload';
import type { User } from '@/payload-types';

export const tenantOrganizer: Access = ({ req: { user } }: AccessArgs<User>) => {
  if (!user) return false;
  return (user as any).role === 'organizer';
};
