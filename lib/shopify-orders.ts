import { shopifyFetch } from '@/lib/shopify';

// Order history and invoices for wholesale buyers.
//
// Buyers log in through this app, not Shopify customer accounts, so their
// orders are found by the email used at checkout (the theme pre-fills it) or
// by the Shopify customer created on approval. Every lookup checks that the
// order belongs to the buyer before returning anything.
//
// Needs the read_orders scope (read_all_orders too, for orders older than 60 days).

export interface BuyerIdentity {
  email: string;
  shopifyCustomerId?: string | null;
}

export interface OrderSummary {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPrice: string;
  currency: string;
  statusUrl: string;
}

export interface InvoiceAddress {
  name: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  zip: string;
  country: string;
  phone: string;
}

export interface InvoiceLine {
  title: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

export interface Invoice {
  id: string;
  name: string;
  createdAt: string;
  poNumber: string;
  email: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  currency: string;
  paymentMethods: string[];
  shippingMethod: string;
  billingAddress: InvoiceAddress | null;
  shippingAddress: InvoiceAddress | null;
  lines: InvoiceLine[];
  subtotal: string;
  discounts: string;
  shipping: string;
  tax: string;
  total: string;
  note: string;
}

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Paid',
  PENDING: 'Pending',
  AUTHORIZED: 'Authorized',
  PARTIALLY_PAID: 'Partially paid',
  PARTIALLY_REFUNDED: 'Partially refunded',
  REFUNDED: 'Refunded',
  VOIDED: 'Voided',
  EXPIRED: 'Expired',
  FULFILLED: 'Fulfilled',
  UNFULFILLED: 'Unfulfilled',
  PARTIALLY_FULFILLED: 'Partially fulfilled',
  IN_PROGRESS: 'In progress',
  ON_HOLD: 'On hold',
  OPEN: 'Open',
  SCHEDULED: 'Scheduled',
  RESTOCKED: 'Restocked',
  PENDING_FULFILLMENT: 'Pending fulfillment',
  REQUEST_DECLINED: 'Request declined',
};

const label = (value?: string | null) =>
  value ? STATUS_LABELS[value] || value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : '';

const MONEY = 'shopMoney { amount currencyCode }';
const ADDRESS = 'name company address1 address2 city province zip country phone';

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const { res, data } = await shopifyFetch('graphql.json', {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok || data.errors) {
    const detail = JSON.stringify(data.errors || data).slice(0, 300);
    if (/access denied|read_orders|ACCESS_DENIED/i.test(detail)) {
      throw new Error('ORDERS_SCOPE_MISSING');
    }
    throw new Error(`Shopify GraphQL ${res.status}: ${detail}`);
  }
  return data.data as T;
}

const customerGid = (id?: string | null) =>
  id ? (id.startsWith('gid://') ? id : `gid://shopify/Customer/${id}`) : '';

function belongsTo(order: { email?: string | null; customer?: { id: string } | null }, buyer: BuyerIdentity) {
  const email = buyer.email.trim().toLowerCase();
  if (order.email && order.email.trim().toLowerCase() === email) return true;
  const gid = customerGid(buyer.shopifyCustomerId);
  return !!(gid && order.customer && order.customer.id === gid);
}

const legacyId = (gid: string) => gid.split('/').pop() || gid;

/** Up to the 50 most recent orders for a buyer, newest first. */
export async function listBuyerOrders(buyer: BuyerIdentity): Promise<OrderSummary[]> {
  const email = buyer.email.trim().toLowerCase().replace(/"/g, '');
  const terms = [`email:"${email}"`];
  const custId = legacyId(customerGid(buyer.shopifyCustomerId));
  if (/^\d+$/.test(custId)) terms.push(`customer_id:${custId}`);

  const data = await graphql<{ orders: { nodes: any[] } }>(
    `query BuyerOrders($q: String!) {
      orders(first: 50, sortKey: CREATED_AT, reverse: true, query: $q) {
        nodes {
          id name createdAt email statusPageUrl
          displayFinancialStatus displayFulfillmentStatus
          customer { id }
          totalPriceSet { ${MONEY} }
        }
      }
    }`,
    { q: terms.join(' OR ') }
  );

  return data.orders.nodes
    .filter((o) => belongsTo(o, buyer))
    .map((o) => ({
      id: legacyId(o.id),
      name: o.name,
      createdAt: o.createdAt,
      displayFinancialStatus: label(o.displayFinancialStatus),
      displayFulfillmentStatus: label(o.displayFulfillmentStatus),
      totalPrice: o.totalPriceSet.shopMoney.amount,
      currency: o.totalPriceSet.shopMoney.currencyCode,
      statusUrl: o.statusPageUrl || '',
    }));
}

function toAddress(a: any): InvoiceAddress | null {
  if (!a) return null;
  return {
    name: a.name || '',
    company: a.company || '',
    address1: a.address1 || '',
    address2: a.address2 || '',
    city: a.city || '',
    province: a.province || '',
    zip: a.zip || '',
    country: a.country || '',
    phone: a.phone || '',
  };
}

/** One order as invoice data, or null if it doesn't exist or isn't the buyer's. */
export async function getBuyerInvoice(buyer: BuyerIdentity, orderId: string): Promise<Invoice | null> {
  if (!/^\d+$/.test(orderId)) return null;

  const data = await graphql<{ order: any }>(
    `query BuyerInvoice($id: ID!) {
      order(id: $id) {
        id name createdAt email poNumber note
        displayFinancialStatus displayFulfillmentStatus
        paymentGatewayNames
        customer { id }
        shippingLine { title }
        billingAddress { ${ADDRESS} }
        shippingAddress { ${ADDRESS} }
        subtotalPriceSet { ${MONEY} }
        totalDiscountsSet { ${MONEY} }
        totalShippingPriceSet { ${MONEY} }
        totalTaxSet { ${MONEY} }
        totalPriceSet { ${MONEY} }
        lineItems(first: 250) {
          nodes {
            name title variantTitle sku quantity
            originalUnitPriceSet { ${MONEY} }
            discountedTotalSet { ${MONEY} }
          }
        }
      }
    }`,
    { id: `gid://shopify/Order/${orderId}` }
  );

  const o = data.order;
  if (!o || !belongsTo(o, buyer)) return null;

  const amount = (set: any) => (set && set.shopMoney ? set.shopMoney.amount : '0.00');

  return {
    id: legacyId(o.id),
    name: o.name,
    createdAt: o.createdAt,
    poNumber: o.poNumber || '',
    email: o.email || '',
    displayFinancialStatus: label(o.displayFinancialStatus),
    displayFulfillmentStatus: label(o.displayFulfillmentStatus),
    currency: o.totalPriceSet.shopMoney.currencyCode,
    paymentMethods: o.paymentGatewayNames || [],
    shippingMethod: o.shippingLine ? o.shippingLine.title : '',
    billingAddress: toAddress(o.billingAddress),
    shippingAddress: toAddress(o.shippingAddress),
    lines: o.lineItems.nodes.map((li: any) => ({
      title: li.title || li.name,
      variantTitle: li.variantTitle && li.variantTitle !== 'Default Title' ? li.variantTitle : '',
      sku: li.sku || '',
      quantity: li.quantity,
      unitPrice: amount(li.originalUnitPriceSet),
      total: amount(li.discountedTotalSet),
    })),
    subtotal: amount(o.subtotalPriceSet),
    discounts: amount(o.totalDiscountsSet),
    shipping: amount(o.totalShippingPriceSet),
    tax: amount(o.totalTaxSet),
    total: amount(o.totalPriceSet),
    note: o.note || '',
  };
}

/** Message shown to the buyer when orders can't be loaded. */
export function orderErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === 'ORDERS_SCOPE_MISSING') {
    return 'Order history is not available yet. Please contact your sales rep for invoices.';
  }
  return 'We could not load your orders right now. Please try again later.';
}
