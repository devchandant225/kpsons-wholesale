import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ApplicationStatus } from '@prisma/client';
import { prisma, serializeApplication } from '@/lib/db';
import { checkAdminAuth } from '@/lib/admin-auth';

const STATUSES: ApplicationStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO'];

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as ApplicationStatus | null;
  const search = (searchParams.get('search') || '').trim().slice(0, 100);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));

  try {
    const where: Prisma.WholesaleApplicationWhereInput = {};
    if (status && STATUSES.includes(status)) {
      where.status = status;
    }
    if (search) {
      // Prisma escapes the text, so it is matched literally (case-insensitive).
      const contains = { contains: search, mode: 'insensitive' as const };
      where.OR = [{ businessName: contains }, { email: contains }, { dba: contains }, { state: contains }];
    }

    const [total, rows, grouped] = await Promise.all([
      prisma.wholesaleApplication.count({ where }),
      prisma.wholesaleApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.wholesaleApplication.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Partial<
      Record<ApplicationStatus, number>
    >;
    const counts = {
      all: grouped.reduce((sum, g) => sum + g._count._all, 0),
      pending: byStatus.PENDING || 0,
      approved: byStatus.APPROVED || 0,
      rejected: byStatus.REJECTED || 0,
      needsInfo: byStatus.NEEDS_INFO || 0,
    };

    return NextResponse.json({
      ok: true,
      applications: rows.map(serializeApplication),
      counts,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('Failed to list applications:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load applications' }, { status: 500 });
  }
}
