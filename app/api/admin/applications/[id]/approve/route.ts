import { NextRequest, NextResponse } from 'next/server';
import { prisma, serializeApplication } from '@/lib/db';
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
    const row = await prisma.wholesaleApplication.findUnique({ where: { id: params.id } });

    if (!row) {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
    }
    if (row.status === 'APPROVED') {
      return NextResponse.json({ ok: false, error: 'This application is already approved.' }, { status: 409 });
    }

    // 1. Sync to Shopify Admin (create customer with wholesale tags)
    const shopifyResult = await createApprovedShopifyCustomer(serializeApplication(row));
    if (!shopifyResult.success) {
      return NextResponse.json(
        { ok: false, error: `Shopify sync failed: ${shopifyResult.error}. Account was not approved.` },
        { status: 502 }
      );
    }

    // 2. Update status in Postgres
    const updated = await prisma.wholesaleApplication.update({
      where: { id: row.id },
      data: {
        status: 'APPROVED',
        shopifyCustomerId: shopifyResult.customerId || '',
        rejectionReason: '',
        reviewedBy: admin.email,
        reviewedAt: new Date(),
      },
    });

    // 3. Send approval email to customer
    sendApplicationApprovedEmail(updated.email, updated.businessName).catch((err) =>
      console.error('Failed to send approval email:', err)
    );

    return NextResponse.json({
      ok: true,
      message: `Account approved and synced to Shopify (Customer ID: ${shopifyResult.customerId})`,
      application: serializeApplication(updated),
    });
  } catch (error: any) {
    console.error('Approval error:', error);
    return NextResponse.json({ ok: false, error: 'Approval failed' }, { status: 500 });
  }
}
