// src/lib/auth.ts
import payload from 'payload';
import { jwtVerify } from 'jose';

export async function getUserFromAuth(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    throw new Error('Unauthorized - missing Authorization header');
  }

  const token = authHeader.startsWith('JWT ')
    ? authHeader.replace('JWT ', '').trim()
    : authHeader.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '').trim()
    : null;

  if (!token) {
    throw new Error('Unauthorized - invalid Authorization format');
  }

  // jose expects Uint8Array key
  const secret = new TextEncoder().encode(
    (payload as any)?.secret ?? process.env.PAYLOAD_SECRET!
  );

  const { payload: jwtPayload } = await jwtVerify(token, secret);

  const userId = jwtPayload.id ?? jwtPayload.sub;
  if (!userId) {
    throw new Error('Unauthorized - token missing user id');
  }

  const user = await payload.findByID({
    collection: 'users',
    id: String(userId),
    depth: 0,
  });

  if (!user) {
    throw new Error('Unauthorized - user not found');
  }

  return user;
}
