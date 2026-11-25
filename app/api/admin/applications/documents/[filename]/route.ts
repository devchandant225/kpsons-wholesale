import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkAdminAuth } from '@/lib/admin-auth';
import { getAbsoluteFilePath, CONTENT_TYPE_BY_EXT } from '@/lib/file-storage';

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  if (!checkAdminAuth(request)) {
    return new NextResponse('Unauthorized to view sensitive compliance documents.', { status: 401 });
  }

  const filename = path.basename(params.filename || '');
  const contentType = CONTENT_TYPE_BY_EXT[path.extname(filename).toLowerCase()];
  if (!filename || !contentType) {
    return new NextResponse('Document not found', { status: 404 });
  }

  const filePath = getAbsoluteFilePath(filename);
  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.promises.readFile(filePath);
  } catch {
    return new NextResponse('Document not found on disk', { status: 404 });
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
