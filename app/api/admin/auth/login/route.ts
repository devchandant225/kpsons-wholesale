import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, generateAdminToken } from '@/lib/auth';
import { ADMIN_COOKIE } from '@/lib/admin-auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  if (!rateLimit(`admin-login:${clientIp(request)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: 'Too many login attempts. Try again in 15 minutes.' }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Email and password are required' }, { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } });

    if (!admin || !(await comparePassword(password, admin.passwordHash))) {
      return NextResponse.json({ ok: false, error: 'Invalid admin credentials' }, { status: 401 });
    }

    const token = generateAdminToken({ id: admin.id, email: admin.email, role: admin.role });

    // The token lives only in the httpOnly cookie; it is not returned to page JS.
    const response = NextResponse.json({
      ok: true,
      user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });

    response.cookies.set({
      name: ADMIN_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
