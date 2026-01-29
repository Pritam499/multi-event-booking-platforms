// src/lib/auth.ts
// DEPRECATED: This file is deprecated. Use the new auth middleware from '@/middleware/auth' instead.
// This file is kept for backward compatibility but will be removed in future versions.

import { verifyToken } from '@/middleware/auth';

/**
 * @deprecated Use verifyToken from '@/middleware/auth' instead
 */
export async function getUserFromAuth(request: Request) {
  const user = await verifyToken(request as any);
  if (!user) {
    throw new Error('Unauthorized - invalid token');
  }
  return user;
}
