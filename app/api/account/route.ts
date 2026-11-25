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
  if (!payload || !payload.id || !isValidId(payload.id)) {
    return jsonResponse({ loggedIn: false }, 401, origin);
  }

  try {
    const app = await prisma.wholesaleApplication.findUnique({ where: { id: payload.id } });

    // Same rule as /api/session: only approved accounts count as logged in.
    if (!app || app.status !== 'APPROVED') {
      return jsonResponse({ loggedIn: false }, 401, origin);
    }

    return jsonResponse(
      {
        loggedIn: true,
        // Top-level fields read by the theme's wholesale-account section.
        email: app.email,
        businessName: app.businessName,
        // Order history isn't wired up yet; the theme shows "no orders".
        orders: [],
        account: {
          id: app.id,
          email: app.email,
          businessName: app.businessName,
          dba: app.dba,
          phone: app.businessPhone,
          address: {
            line1: app.addressLine1,
            line2: app.addressLine2,
            city: app.city,
            state: app.state,
            postalCode: app.postalCode,
            country: app.country,
          },
          billing: {
            sameAsBusiness: app.billingSameAsBusiness,
            name: app.billingName,
            line1: app.billingLine1,
            line2: app.billingLine2,
            city: app.billingCity,
            state: app.billingState,
            postalCode: app.billingPostalCode,
            country: app.billingCountry,
          },
          status: app.status,
          salesRep: app.assignedSalesRep || 'Lansdale Sales Desk (+1 267 902-1290)',
          createdAt: app.createdAt,
        },
      },
      200,
      origin
    );
  } catch (error) {
    console.error('Account lookup error:', error);
    return jsonResponse({ loggedIn: false, error: 'Failed to load account' }, 500, origin);
  }
}
