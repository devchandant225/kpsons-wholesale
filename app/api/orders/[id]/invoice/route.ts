import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { getApprovedBuyer } from '@/lib/buyer-session';
import { getBuyerInvoice, orderErrorMessage } from '@/lib/shopify-orders';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

// Invoice data for one of the logged-in buyer's orders. The theme renders and prints it.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const origin = request.headers.get('origin');
  const id = params.id;

  try {
    const app = await getApprovedBuyer(request);
    if (!app) return jsonResponse({ loggedIn: false }, 401, origin);

    const invoice = await getBuyerInvoice({ email: app.email, shopifyCustomerId: app.shopifyCustomerId }, id);
    if (!invoice) return jsonResponse({ error: 'Order not found' }, 404, origin);

    return jsonResponse(
      {
        invoice,
        buyer: {
          businessName: app.businessName,
          dba: app.dba,
          email: app.email,
          phone: app.businessPhone,
        },
      },
      200,
      origin
    );
  } catch (error) {
    console.error('Invoice lookup error:', error);
    return jsonResponse({ error: orderErrorMessage(error) }, 500, origin);
  }
}
