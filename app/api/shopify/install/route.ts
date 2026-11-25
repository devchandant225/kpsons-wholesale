import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { OAUTH_STATE_COOKIE, SHOPIFY_SCOPES, SHOPIFY_STORE_DOMAIN, redirectUri } from '@/lib/shopify-oauth';

export const dynamic = 'force-dynamic';

/**
 * Starts the one-time Shopify connection. Open it while signed in to /admin as
 * an ADMIN: https://<app>/api/shopify/install
 */
export async function GET(request: NextRequest) {
  const admin = checkAdminAuth(request);
  if (!admin) {
    // APP_URL, not request.url: behind nginx, request.url is the internal localhost address.
    return NextResponse.redirect(new URL('/admin/login', process.env.APP_URL || request.url));
  }
  if (admin.role !== 'ADMIN') {
    return new NextResponse('Only admins can connect Shopify.', { status: 403 });
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  if (!clientId || !process.env.SHOPIFY_CLIENT_SECRET) {
    return new NextResponse('Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in .env first.', { status: 500 });
  }

  const state = crypto.randomBytes(24).toString('hex');
  const authorize = new URL(`https://${SHOPIFY_STORE_DOMAIN}/admin/oauth/authorize`);
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('scope', SHOPIFY_SCOPES);
  authorize.searchParams.set('redirect_uri', redirectUri());
  authorize.searchParams.set('state', state);
  // No grant_options[]=per-user, so Shopify issues an offline (store-level) token.

  const response = NextResponse.redirect(authorize.toString());
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Lax (not strict) so the cookie comes back on Shopify's redirect to the callback.
    sameSite: 'lax',
    path: '/api/shopify',
    maxAge: 10 * 60,
  });
  return response;
}
