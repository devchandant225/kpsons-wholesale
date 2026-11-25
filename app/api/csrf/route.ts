import { NextRequest } from 'next/server';
import { generateCsrfToken } from '@/lib/auth';
import { handleOptions, jsonResponse } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const token = generateCsrfToken();
  return jsonResponse({ csrfToken: token }, 200, origin);
}
