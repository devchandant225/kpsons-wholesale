import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { verifyAdminToken, UserTokenPayload } from '@/lib/auth';

export const ADMIN_COOKIE = 'kp_admin_token';

/** Returns the staff user for this request, or null if not signed in as staff. */
export function checkAdminAuth(request: NextRequest): UserTokenPayload | null {
  const header = request.headers.get('authorization');
  const token =
    request.cookies.get(ADMIN_COOKIE)?.value ||
    (header && header.startsWith('Bearer ') ? header.substring(7).trim() : '');
  if (!token) return null;
  return verifyAdminToken(token);
}

export function isValidId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}
