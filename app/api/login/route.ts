import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { handleOptions, jsonResponse } from '@/lib/cors';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (!rateLimit(`login:${clientIp(request)}`, 20, 15 * 60 * 1000)) {
    return jsonResponse({ ok: false, error: 'Too many login attempts. Please try again in 15 minutes.' }, 429, origin);
  }

  try {
    let email = '';
    let password = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = body.email || '';
      password = body.password || '';
    } else {
      const formData = await request.formData();
      email = (formData.get('email') as string) || '';
      password = (formData.get('password') as string) || '';
    }

    email = email.trim().toLowerCase();

    if (!email || !password) {
      return jsonResponse({ ok: false, error: 'Email and password are required.' }, 400, origin);
    }

    const application = await prisma.wholesaleApplication.findUnique({ where: { email } });

    if (!application) {
      return jsonResponse({ ok: false, error: 'Invalid email or password.' }, 401, origin);
    }

    const passwordMatches = await comparePassword(password, application.passwordHash);
    if (!passwordMatches) {
      return jsonResponse({ ok: false, error: 'Invalid email or password.' }, 401, origin);
    }

    // Check account status
    if (application.status === 'PENDING') {
      return jsonResponse(
        {
          ok: false,
          error: 'Your application is currently under review by our compliance team. You will receive an email once approved.',
          status: 'PENDING',
        },
        403,
        origin
      );
    }

    if (application.status === 'REJECTED') {
      return jsonResponse(
        {
          ok: false,
          error: `Your application could not be approved. Reason: ${application.rejectionReason || 'Documentation issue'}. Please contact support.`,
          status: 'REJECTED',
        },
        403,
        origin
      );
    }

    // Only approved accounts get a session (e.g. NEEDS_INFO must not).
    if (application.status !== 'APPROVED') {
      return jsonResponse(
        {
          ok: false,
          error: 'Our team needs more information about your application. Please check your email or call +1 (267) 902-1290.',
          status: application.status,
        },
        403,
        origin
      );
    }

    // Generate JWT token
    const token = generateToken({
      id: application.id,
      email: application.email,
      businessName: application.businessName,
      status: application.status,
    });

    const response = jsonResponse(
      {
        ok: true,
        token,
        customer: {
          id: application.id,
          email: application.email,
          businessName: application.businessName,
          status: application.status,
          salesRep: application.assignedSalesRep || 'Sales Desk',
        },
      },
      200,
      origin
    );

    // Set HTTP-only secure cookie for cross-subdomain / site-gate usage
    response.cookies.set({
      name: 'wsp_session_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return jsonResponse({ ok: false, error: 'An unexpected server error occurred.' }, 500, origin);
  }
}
