import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { WholesaleApplication } from '@/models/WholesaleApplication';
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

    await connectToDatabase();
    const application = await WholesaleApplication.findById(params.id);

    if (!application) {
      return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
    }

    application.status = 'REJECTED';
    application.rejectionReason = reason || 'Documentation verification failed.';
    application.reviewedBy = admin.email;
    application.reviewedAt = new Date();
    await application.save();

    // Note: if this account was approved before, its Shopify customer keeps its
    // wholesale tags. Storefront access is still revoked because /api/session
    // only treats APPROVED applications as logged in.
    sendApplicationRejectedEmail(application.email, application.businessName, application.rejectionReason).catch(
      (err) => console.error('Failed to send rejection email:', err)
    );

    const { passwordHash, ...safe } = application.toObject();
    return NextResponse.json({
      ok: true,
      message: 'Application marked as rejected and notification email sent.',
      application: safe,
    });
  } catch (error: any) {
    console.error('Rejection error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
