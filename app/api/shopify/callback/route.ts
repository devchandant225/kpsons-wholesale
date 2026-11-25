import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  OAUTH_STATE_COOKIE,
  SHOPIFY_STORE_DOMAIN,
  isValidShopDomain,
  verifyCallbackHmac,
} from '@/lib/shopify-oauth';

export const dynamic = 'force-dynamic';

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:60px auto;padding:0 16px;color:#16130f">
<h1 style="font-size:20px;color:#123f28">${title}</h1><p style="line-height:1.6">${body}</p>
<p><a href="/admin" style="color:#123f28;font-weight:600">&larr; Back to the admin dashboard</a></p></body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/** Shopify redirects here after the store approves the app (see /api/shopify/install). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const shop = params.get('shop') || '';
  const code = params.get('code') || '';
  const state = params.get('state') || '';
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return page('Shopify not configured', 'Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in .env.', 424);
  }

  // The state cookie is only set by the admin-only install route, so this also
  // proves the flow was started by a signed-in admin.
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!expectedState || expectedState !== state) {
    return page(
      'Connection expired',
      'Start again from the admin dashboard (Connect Shopify), in the same browser, within 10 minutes.',
      400
    );
  }
  if (!verifyCallbackHmac(params, clientSecret)) {
    return page('Invalid request', 'The request did not come from Shopify (bad signature).', 400);
  }
  if (!isValidShopDomain(shop) || shop !== SHOPIFY_STORE_DOMAIN) {
    return page('Wrong store', `This app is set up for ${SHOPIFY_STORE_DOMAIN}, not ${shop || 'unknown'}.`, 400);
  }
  if (!code) {
    return page('Not approved', 'Shopify did not return an authorization code.', 400);
  }

  try {
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      console.error('Shopify OAuth token exchange failed:', res.status, data);
      return page('Shopify connection failed', `Shopify returned ${res.status}. Check pm2 logs and try again.`, 424);
    }

    await prisma.shopifyToken.upsert({
      where: { shop },
      update: { accessToken: data.access_token, scope: data.scope || '' },
      create: { shop, accessToken: data.access_token, scope: data.scope || '' },
    });
    console.log(`✅ Shopify connected for ${shop} (scopes: ${data.scope || 'n/a'})`);

    const response = page(
      'Shopify connected',
      `The app can now create and tag wholesale customers in ${shop}. Approved scopes: ${data.scope || 'n/a'}.`
    );
    response.cookies.set({ name: OAUTH_STATE_COOKIE, value: '', path: '/api/shopify', expires: new Date(0) });
    return response;
  } catch (error) {
    console.error('Shopify OAuth callback error:', error);
    return page('Shopify connection failed', 'Could not reach Shopify. Check pm2 logs and try again.', 424);
  }
}
