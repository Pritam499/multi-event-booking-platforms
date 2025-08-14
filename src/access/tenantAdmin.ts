import type { Access, AccessArgs } from 'payload';
import type { User } from '@/payload-types';

export const tenantAdmin: Access = ({ req: { user } }: AccessArgs<User>) => {
  if (!user) return false;
  return (user as any).role === 'admin';
};
