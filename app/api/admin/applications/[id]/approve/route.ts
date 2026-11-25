import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { WholesaleApplication } from '@/models/WholesaleApplication';
import { checkAdminAuth, isValidId } from '@/lib/admin-auth';
import { createApprovedShopifyCustomer } from '@/lib/shopify';
import { sendApplicationApprovedEmail } from '@/lib/email';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = checkAdminAuth(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isValidId(params.id)) {
    return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
  }

  try {
    await connectToDatabase();
    const application = await WholesaleApplication.findById(params.id);

    if (!application) {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
    }
    if (application.status === 'APPROVED') {
      return NextResponse.json({ ok: false, error: 'This application is already approved.' }, { status: 409 });
    }

    // 1. Sync to Shopify Admin (create customer with wholesale tags)
    const shopifyResult = await createApprovedShopifyCustomer(application);
    if (!shopifyResult.success) {
      return NextResponse.json(
        { ok: false, error: `Shopify sync failed: ${shopifyResult.error}. Account was not approved.` },
        { status: 502 }
      );
    }

    // 2. Update status in MongoDB
    application.status = 'APPROVED';
    application.shopifyCustomerId = shopifyResult.customerId || '';
    application.rejectionReason = '';
    application.reviewedBy = admin.email;
    application.reviewedAt = new Date();
    await application.save();

    // 3. Send approval email to customer
    sendApplicationApprovedEmail(application.email, application.businessName).catch((err) =>
      console.error('Failed to send approval email:', err)
    );

    const { passwordHash, ...safe } = application.toObject();
    return NextResponse.json({
      ok: true,
      message: `Account approved and synced to Shopify (Customer ID: ${shopifyResult.customerId})`,
      application: safe,
    });
  } catch (error: any) {
    console.error('Approval error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
