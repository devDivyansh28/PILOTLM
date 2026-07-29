const store = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export function rateLimit(key: string, options: RateLimitOptions): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, remaining: options.limit - 1 };
  }

  entry.count++;
  if (entry.count > options.limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: options.limit - entry.count };
}

export function rateLimitMiddleware(request: Request, options: RateLimitOptions = { limit: 30, windowMs: 60000 }) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  return rateLimit(ip, options);
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);
