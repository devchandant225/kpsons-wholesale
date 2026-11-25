import { IWholesaleApplication } from '@/types';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'ujwt36-mq.myshopify.com';
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
// Shopify only supports each API version for ~12 months. Keep this current.
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-10';

const WHOLESALE_TAGS = ['wholesale', 'b2b-approved', 'tax-exempt'];

export interface CreateShopifyCustomerResult {
  success: boolean;
  customerId?: string;
  error?: string;
}

const apiUrl = (p: string) => `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/${p}`;

async function shopifyFetch(p: string, init: RequestInit = {}) {
  const res = await fetch(apiUrl(p), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN!,
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/** Shopify rejects phone numbers that aren't valid E.164; normalise US numbers. */
function toE164(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return undefined; // unknown format: leave it off rather than fail approval
}

/**
 * Creates the approved wholesale customer in Shopify, or tags the existing
 * customer if one already uses this email.
 */
export async function createApprovedShopifyCustomer(
  application: IWholesaleApplication
): Promise<CreateShopifyCustomerResult> {
  if (!SHOPIFY_ADMIN_ACCESS_TOKEN) {
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'SHOPIFY_ADMIN_ACCESS_TOKEN is not configured on the server.' };
    }
    console.warn('⚠️ SHOPIFY_ADMIN_ACCESS_TOKEN missing. Simulating approval (development only).');
    return { success: true, customerId: `mock_shopify_${Date.now()}` };
  }

  try {
    // Look up first: avoids relying on the shape of Shopify's "taken" error.
    const existingId = await findCustomerIdByEmail(application.email);
    if (existingId) return await tagExistingCustomer(existingId);

    const phone = toE164(application.businessPhone);
    const { res, data } = await shopifyFetch('customers.json', {
      method: 'POST',
      body: JSON.stringify({
        customer: {
          // The form doesn't collect a contact name, so use the business name.
          first_name: application.businessName,
          last_name: application.dba || '',
          email: application.email,
          phone,
          verified_email: true,
          tax_exempt: true,
          tags: WHOLESALE_TAGS.join(', '),
          note: `Wholesale account approved in KP Admin. Business: ${application.businessName}. DBA: ${application.dba || 'N/A'}.`,
          addresses: [
            {
              company: application.businessName,
              address1: application.address.line1,
              address2: application.address.line2 || '',
              city: application.address.city,
              province: application.address.state,
              zip: application.address.postalCode,
              country: application.address.country || 'US',
              phone: phone || '',
              default: true,
            },
          ],
          send_email_invite: false,
        },
      }),
    });

    if (!res.ok) {
      return { success: false, error: `Shopify ${res.status}: ${JSON.stringify(data.errors || data)}` };
    }
    return { success: true, customerId: String(data.customer.id) };
  } catch (error: any) {
    console.error('Error creating customer in Shopify:', error);
    return { success: false, error: error.message || 'Unknown network error' };
  }
}

async function findCustomerIdByEmail(email: string): Promise<string | null> {
  const { res, data } = await shopifyFetch(
    `customers/search.json?query=${encodeURIComponent(`email:"${email}"`)}&fields=id,email`
  );
  if (!res.ok) throw new Error(`Shopify customer search failed (${res.status})`);
  const match = (data.customers || []).find(
    (c: { email?: string }) => (c.email || '').toLowerCase() === email.toLowerCase()
  );
  return match ? String(match.id) : null;
}

async function tagExistingCustomer(customerId: string): Promise<CreateShopifyCustomerResult> {
  const { res: getRes, data: getData } = await shopifyFetch(`customers/${customerId}.json?fields=id,tags`);
  if (!getRes.ok) return { success: false, error: `Could not load Shopify customer ${customerId} (${getRes.status})` };

  const existingTags: string[] = (getData.customer?.tags || '')
    .split(',')
    .map((t: string) => t.trim())
    .filter(Boolean);
  const tags = Array.from(new Set([...existingTags, ...WHOLESALE_TAGS])).join(', ');

  const { res, data } = await shopifyFetch(`customers/${customerId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ customer: { id: Number(customerId), tags, tax_exempt: true } }),
  });
  if (!res.ok) {
    return { success: false, error: `Shopify ${res.status} tagging customer: ${JSON.stringify(data.errors || data)}` };
  }
  return { success: true, customerId };
}
