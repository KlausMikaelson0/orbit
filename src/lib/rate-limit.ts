export interface OrbitRateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface OrbitRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  timestamps: number[];
}

type BucketMap = Map<string, Bucket>;

const globalRef = globalThis as unknown as {
  __orbitRateLimitBuckets?: BucketMap;
};

function getBuckets(): BucketMap {
  if (!globalRef.__orbitRateLimitBuckets) {
    globalRef.__orbitRateLimitBuckets = new Map<string, Bucket>();
  }
  return globalRef.__orbitRateLimitBuckets;
}

export function checkOrbitRateLimit({
  key,
  limit,
  windowMs,
}: OrbitRateLimitOptions): OrbitRateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const buckets = getBuckets();
  const bucket = buckets.get(key) ?? { timestamps: [] };

  bucket.timestamps = bucket.timestamps.filter((timestamp) => timestamp >= cutoff);

  if (bucket.timestamps.length >= limit) {
    const retryAt = bucket.timestamps[0] + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((retryAt - now) / 1000));
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    retryAfterSeconds: 0,
  };
}
