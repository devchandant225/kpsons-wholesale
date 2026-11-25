import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { prisma } from '@/lib/db';
import { isValidId } from '@/lib/admin-auth';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Check Bearer token in header or cookie
  let token = '';
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    token = request.cookies.get('wsp_session_token')?.value || '';
  }

  if (!token) {
    return jsonResponse({ loggedIn: false }, 200, origin);
  }

  const payload = verifyToken(token);
  if (!payload || !payload.id || !isValidId(payload.id)) {
    return jsonResponse({ loggedIn: false }, 200, origin);
  }

  try {
    const app = await prisma.wholesaleApplication.findUnique({
      where: { id: payload.id },
      select: { email: true, businessName: true, status: true, assignedSalesRep: true },
    });

    if (!app || app.status !== 'APPROVED') {
      return jsonResponse({ loggedIn: false, status: app?.status || 'UNKNOWN' }, 200, origin);
    }

    return jsonResponse(
      {
        loggedIn: true,
        email: app.email,
        businessName: app.businessName,
        status: app.status,
        salesRep: app.assignedSalesRep || '',
      },
      200,
      origin
    );
  } catch (err) {
    return jsonResponse({ loggedIn: false }, 200, origin);
  }
}
