import { NextResponse } from 'next/server';

// Only these storefront origins may call the API with credentials.
// Override with a comma-separated ALLOWED_ORIGINS env var.
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  'https://kpsonswholesale.com,https://www.kpsonswholesale.com,https://ujwt36-mq.myshopify.com'
)
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return origin;
  }
  return null;
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin' };
  const allowed = allowedOrigin(origin);
  if (allowed) {
    headers['Access-Control-Allow-Origin'] = allowed;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRF-Token, Accept';
  }
  return headers;
}

export function handleOptions(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin')),
  });
}

export function jsonResponse(data: any, status: number = 200, origin: string | null = null) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders(origin),
  });
}
