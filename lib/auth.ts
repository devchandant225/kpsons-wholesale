import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Reads a signing secret. In production a missing or short secret is a hard
 * error (otherwise anyone could forge session tokens). Read lazily so that
 * `next build` does not fail when the env file is only present at runtime.
 */
function secret(name: 'JWT_SECRET' | 'CSRF_SECRET'): string {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set to a random string of at least 32 characters.`);
  }
  return value || `dev_only_${name.toLowerCase()}_do_not_use_in_production`;
}

// Buyer and staff tokens use different audiences, so a retailer's token is
// never accepted by the admin API.
const BUYER_AUDIENCE = 'kp-buyer';
const ADMIN_AUDIENCE = 'kp-admin';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface UserTokenPayload {
  id: string;
  email: string;
  businessName?: string;
  status?: string;
  role?: string;
}

function sign(payload: UserTokenPayload, audience: string, expiresIn: string): string {
  return jwt.sign(payload, secret('JWT_SECRET'), { expiresIn, audience } as jwt.SignOptions);
}

function verify(token: string, audience: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, secret('JWT_SECRET'), { audience }) as UserTokenPayload;
  } catch {
    return null;
  }
}

/** Session token for an approved wholesale buyer (storefront). */
export function generateToken(payload: UserTokenPayload, expiresIn: string = '7d'): string {
  return sign(payload, BUYER_AUDIENCE, expiresIn);
}

export function verifyToken(token: string): UserTokenPayload | null {
  return verify(token, BUYER_AUDIENCE);
}

/** Session token for KP staff using /admin. */
export function generateAdminToken(payload: UserTokenPayload, expiresIn: string = '12h'): string {
  return sign(payload, ADMIN_AUDIENCE, expiresIn);
}

export function verifyAdminToken(token: string): UserTokenPayload | null {
  const payload = verify(token, ADMIN_AUDIENCE);
  if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'REP')) return null;
  return payload;
}

export function generateCsrfToken(): string {
  return jwt.sign({ n: crypto.randomBytes(16).toString('hex') }, secret('CSRF_SECRET'), { expiresIn: '1h' });
}

export function verifyCsrfToken(token: string): boolean {
  try {
    jwt.verify(token, secret('CSRF_SECRET'));
    return true;
  } catch {
    return false;
  }
}
