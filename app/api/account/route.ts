import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { getApprovedBuyer } from '@/lib/buyer-session';
import { listBuyerOrders, orderErrorMessage, OrderSummary } from '@/lib/shopify-orders';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    // Only approved accounts count as logged in (same rule as /api/session).
    const app = await getApprovedBuyer(request);
    if (!app) {
      return jsonResponse({ loggedIn: false }, 401, origin);
    }

    let orders: OrderSummary[] = [];
    let orderError = '';
    try {
      orders = await listBuyerOrders({ email: app.email, shopifyCustomerId: app.shopifyCustomerId });
    } catch (error) {
      console.error('Order history lookup error:', error);
      orderError = orderErrorMessage(error);
    }

    return jsonResponse(
      {
        loggedIn: true,
        // Top-level fields read by the theme's wholesale-account section.
        email: app.email,
        businessName: app.businessName,
        orders,
        orderError,
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
