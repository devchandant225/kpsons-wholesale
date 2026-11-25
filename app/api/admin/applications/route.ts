import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { WholesaleApplication } from '@/models/WholesaleApplication';
import { checkAdminAuth } from '@/lib/admin-auth';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO'];

/** Escape regex metacharacters so search text is matched literally. */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = (searchParams.get('search') || '').trim().slice(0, 100);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 20));

  try {
    await connectToDatabase();

    const query: Record<string, any> = {};
    if (status && STATUSES.includes(status)) {
      query.status = status;
    }
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      query.$or = [{ businessName: rx }, { email: rx }, { dba: rx }, { 'address.state': rx }];
    }

    const [total, applications, grouped] = await Promise.all([
      WholesaleApplication.countDocuments(query),
      WholesaleApplication.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WholesaleApplication.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);

    const byStatus = Object.fromEntries(grouped.map((g: { _id: string; n: number }) => [g._id, g.n]));
    const counts = {
      all: grouped.reduce((sum: number, g: { n: number }) => sum + g.n, 0),
      pending: byStatus.PENDING || 0,
      approved: byStatus.APPROVED || 0,
      rejected: byStatus.REJECTED || 0,
      needsInfo: byStatus.NEEDS_INFO || 0,
    };

    return NextResponse.json({
      ok: true,
      applications,
      counts,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('Failed to list applications:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
