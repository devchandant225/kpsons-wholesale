import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { WholesaleApplication } from '@/models/WholesaleApplication';
import { checkAdminAuth, isValidId } from '@/lib/admin-auth';

const notFound = () => NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isValidId(params.id)) return notFound();

  try {
    await connectToDatabase();
    const application = await WholesaleApplication.findById(params.id).select('-passwordHash');
    if (!application) return notFound();
    return NextResponse.json({ ok: true, application });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isValidId(params.id)) return notFound();

  try {
    const body = await request.json().catch(() => ({}));
    const allowedUpdates: Record<string, string> = {};
    if (typeof body.assignedSalesRep === 'string') allowedUpdates.assignedSalesRep = body.assignedSalesRep.slice(0, 200);
    if (typeof body.adminNotes === 'string') allowedUpdates.adminNotes = body.adminNotes.slice(0, 10000);

    await connectToDatabase();
    const application = await WholesaleApplication.findByIdAndUpdate(
      params.id,
      { $set: allowedUpdates },
      { new: true }
    ).select('-passwordHash');
    if (!application) return notFound();

    return NextResponse.json({ ok: true, application });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
