import { NextRequest, NextResponse } from 'next/server';
import { prisma, serializeApplication, isNotFound } from '@/lib/db';
import { checkAdminAuth, isValidId } from '@/lib/admin-auth';
import { sendApplicationRejectedEmail } from '@/lib/email';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = checkAdminAuth(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isValidId(params.id)) {
    return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 2000) : '';

    const updated = await prisma.wholesaleApplication.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'Documentation verification failed.',
        reviewedBy: admin.email,
        reviewedAt: new Date(),
      },
    });

    // Note: if this account was approved before, its Shopify customer keeps its
    // wholesale tags. Storefront access is still revoked because /api/session
    // only treats APPROVED applications as logged in.
    sendApplicationRejectedEmail(updated.email, updated.businessName, updated.rejectionReason).catch((err) =>
      console.error('Failed to send rejection email:', err)
    );

    return NextResponse.json({
      ok: true,
      message: 'Application marked as rejected and notification email sent.',
      application: serializeApplication(updated),
    });
  } catch (error: any) {
    if (isNotFound(error)) {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
    }
    console.error('Rejection error:', error);
    return NextResponse.json({ ok: false, error: 'Rejection failed' }, { status: 500 });
  }
}
