import { NextRequest, NextResponse } from "next/server";

// In-memory, so on serverless the window is per warm instance, not global.
// This blunts runaway loops and naive abuse; provider spend caps remain the
// hard backstop for API cost.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function rateLimit(
  request: NextRequest,
  route: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `${route}:${ip}`;
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(k);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  existing.count += 1;
  if (existing.count > limit) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429 }
    );
  }

  return null;
}
