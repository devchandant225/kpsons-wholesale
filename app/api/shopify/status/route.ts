import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { getShopifyConnection } from '@/lib/shopify';

export const dynamic = 'force-dynamic';

/** Whether the app can talk to Shopify, for the admin dashboard banner. */
export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await getShopifyConnection()) });
}
