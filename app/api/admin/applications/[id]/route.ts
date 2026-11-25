import { NextRequest, NextResponse } from 'next/server';
import { prisma, serializeApplication, isNotFound, readDocuments } from '@/lib/db';
import { deleteStoredFiles } from '@/lib/file-storage';
import { checkAdminAuth, isValidId } from '@/lib/admin-auth';

const notFound = () => NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isValidId(params.id)) return notFound();

  try {
    const row = await prisma.wholesaleApplication.findUnique({ where: { id: params.id } });
    if (!row) return notFound();
    return NextResponse.json({ ok: true, application: serializeApplication(row) });
  } catch (error: any) {
    console.error('Failed to load application:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load application' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isValidId(params.id)) return notFound();

  try {
    const body = await request.json().catch(() => ({}));
    const data: { assignedSalesRep?: string; adminNotes?: string } = {};
    if (typeof body.assignedSalesRep === 'string') data.assignedSalesRep = body.assignedSalesRep.slice(0, 200);
    if (typeof body.adminNotes === 'string') data.adminNotes = body.adminNotes.slice(0, 10000);

    const row = await prisma.wholesaleApplication.update({ where: { id: params.id }, data });
    return NextResponse.json({ ok: true, application: serializeApplication(row) });
  } catch (error: any) {
    if (isNotFound(error)) return notFound();
    console.error('Failed to update application:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update application' }, { status: 500 });
  }
}

/**
 * Permanently deletes an application / wholesale account and its uploaded
 * documents. ADMIN staff only (not REP). The Shopify customer, if one was
 * created on approval, is left in Shopify (it may have orders).
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = checkAdminAuth(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (admin.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'Only admins can delete accounts.' }, { status: 403 });
  }
  if (!isValidId(params.id)) return notFound();

  try {
    const row = await prisma.wholesaleApplication.delete({ where: { id: params.id } });
    await deleteStoredFiles(Object.values(readDocuments(row.documents)));
    console.log(`🗑️ Application ${row.id} (${row.email}) deleted by ${admin.email}`);
    return NextResponse.json({
      ok: true,
      message: `${row.businessName} (${row.email}) was deleted.`,
      shopifyCustomerId: row.shopifyCustomerId || null,
    });
  } catch (error: any) {
    if (isNotFound(error)) return notFound();
    console.error('Failed to delete application:', error);
    return NextResponse.json({ ok: false, error: 'Failed to delete account' }, { status: 500 });
  }
}
