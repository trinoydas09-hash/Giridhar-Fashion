interface Bucket {
  timestamps: number[];
}

declare global {
  var __giridharRateLimits: Map<string, Bucket> | undefined;
}

export function checkSlidingRateLimit(
  key: string,
  maxRequests = 20,
  windowMs = 60_000
): { allowed: boolean; retryAfterSeconds: number } {
  if (!globalThis.__giridharRateLimits) {
    globalThis.__giridharRateLimits = new Map();
  }

  const now = Date.now();
  const cutoff = now - windowMs;
  const store = globalThis.__giridharRateLimits;
  const bucket = store.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0] || now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    store.set(key, bucket);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.timestamps.push(now);
  store.set(key, bucket);

  // Periodic cleanup if map grows large
  if (store.size > 2000) {
    for (const [k, b] of store.entries()) {
      if (b.timestamps.every((t) => t <= cutoff)) {
        store.delete(k);
      }
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
