import { NextRequest, NextResponse } from 'next/server';
import { prisma, serializeApplication, isNotFound } from '@/lib/db';
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
