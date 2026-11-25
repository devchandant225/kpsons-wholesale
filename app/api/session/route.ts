import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { connectToDatabase } from '@/lib/mongodb';
import { WholesaleApplication } from '@/models/WholesaleApplication';

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
  if (!payload || !payload.id) {
    return jsonResponse({ loggedIn: false }, 200, origin);
  }

  try {
    await connectToDatabase();
    const app = await WholesaleApplication.findById(payload.id).select('email businessName status assignedSalesRep');

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
