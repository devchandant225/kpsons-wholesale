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

  let token = '';
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    token = request.cookies.get('wsp_session_token')?.value || '';
  }

  if (!token) {
    return jsonResponse({ loggedIn: false }, 401, origin);
  }

  const payload = verifyToken(token);
  if (!payload || !payload.id) {
    return jsonResponse({ loggedIn: false }, 401, origin);
  }

  try {
    await connectToDatabase();
    const app = await WholesaleApplication.findById(payload.id).select('-passwordHash');

    if (!app) {
      return jsonResponse({ loggedIn: false }, 404, origin);
    }

    return jsonResponse(
      {
        loggedIn: true,
        account: {
          id: app._id,
          email: app.email,
          businessName: app.businessName,
          dba: app.dba,
          phone: app.businessPhone,
          address: app.address,
          billing: app.billing,
          status: app.status,
          salesRep: app.assignedSalesRep || 'Lansdale Sales Desk (+1 267 902-1290)',
          createdAt: app.createdAt,
        },
      },
      200,
      origin
    );
  } catch (error) {
    return jsonResponse({ loggedIn: false, error: 'Failed to load account' }, 500, origin);
  }
}
