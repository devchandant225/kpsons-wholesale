import { NextRequest } from 'next/server';
import { handleOptions, jsonResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const response = jsonResponse({ ok: true, message: 'Logged out successfully' }, 200, origin);

  // Clear cookie
  response.cookies.set({
    name: 'wsp_session_token',
    value: '',
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}

// The theme's logout button sends a GET.
export const GET = POST;
