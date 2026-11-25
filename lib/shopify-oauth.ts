import crypto from 'crypto';

/**
 * One-time Shopify OAuth install (authorization code grant) for a Dev Dashboard
 * app that isn't in the store's organization, where the client credentials
 * grant isn't allowed. The resulting offline token is stored in Postgres.
 */
export const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'ujwt36-mq.myshopify.com';
export const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || 'read_customers,write_customers';
export const OAUTH_STATE_COOKIE = 'kp_shopify_oauth_state';

export function redirectUri(): string {
  const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/api/shopify/callback`;
}

export function isValidShopDomain(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop);
}

/** Checks the hmac Shopify adds to the OAuth callback query string. */
export function verifyCallbackHmac(params: URLSearchParams, secret: string): boolean {
  const hmac = params.get('hmac') || '';
  const message = Array.from(params.entries())
    .filter(([key]) => key !== 'hmac' && key !== 'signature')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(hmac, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
