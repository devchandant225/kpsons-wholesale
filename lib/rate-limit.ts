/**
 * Small in-memory fixed-window rate limiter. Fine for the single PM2 instance
 * in ecosystem.config.js; use Redis or similar if you scale to several instances.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: Request): string {
  // nginx sets X-Real-IP to the real client address. X-Forwarded-For's first entry
  // comes from the client and can be faked, so it is only a fallback.
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = request.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',').pop() || 'unknown' : 'unknown').trim();
}

/** Returns true when the request is allowed, false when over the limit. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10000) {
      buckets.forEach((b, k) => {
        if (b.resetAt <= now) buckets.delete(k);
      });
    }
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
