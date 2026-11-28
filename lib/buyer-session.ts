import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isValidId } from '@/lib/admin-auth';

/** The session token from the Bearer header, or the cookie as a fallback. */
export function readBuyerToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.substring(7).trim();
  return request.cookies.get('wsp_session_token')?.value || '';
}

/** The approved wholesale application behind this request, or null. */
export async function getApprovedBuyer(request: NextRequest) {
  const token = readBuyerToken(request);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.id || !isValidId(payload.id)) return null;
  const app = await prisma.wholesaleApplication.findUnique({ where: { id: payload.id } });
  return app && app.status === 'APPROVED' ? app : null;
}
