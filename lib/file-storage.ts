import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DocumentMeta } from '@/types';

// Keep compliance documents OUTSIDE public/ so Next.js never serves them
// statically. They are only reachable through the staff-only documents route.
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'storage', 'uploads');

export function ensureUploadDir(): string {
  if (!fs.existsSync(UPLOAD_BASE_DIR)) {
    fs.mkdirSync(UPLOAD_BASE_DIR, { recursive: true });
  }
  return UPLOAD_BASE_DIR;
}

// The stored extension comes from the detected file type, never from the
// user-supplied filename.
const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  'application/pdf': { ext: '.pdf', magic: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  'image/jpeg': { ext: '.jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': {
    ext: '.png',
    magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/webp': {
    ext: '.webp',
    magic: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/** Validates and saves an uploaded file to disk. */
export async function saveUploadedFile(file: File, categoryPrefix: string = 'doc'): Promise<DocumentMeta> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File ${file.name} exceeds the 15MB size limit.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = Object.entries(TYPES).find(([, t]) => t.magic(buffer));
  if (!detected) {
    throw new Error(`File ${file.name} is not a valid PDF, PNG, JPG, or WEBP.`);
  }
  const [mimetype, { ext }] = detected;

  const uploadDir = ensureUploadDir();
  const filename = `${categoryPrefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
  await fs.promises.writeFile(path.join(uploadDir, filename), buffer);

  return {
    originalName: file.name.slice(0, 200),
    filename,
    path: filename,
    mimetype,
    size: file.size,
    uploadedAt: new Date(),
  };
}

/** Absolute path for a stored document (filename is reduced to its basename). */
export function getAbsoluteFilePath(filename: string): string {
  return path.join(ensureUploadDir(), path.basename(filename));
}

/** Best-effort removal of files saved for a request that then failed. */
export async function deleteStoredFiles(docs: (DocumentMeta | null | undefined)[]) {
  await Promise.all(
    docs
      .filter((d): d is DocumentMeta => !!d)
      .map((d) => fs.promises.unlink(getAbsoluteFilePath(d.filename)).catch(() => undefined))
  );
}
