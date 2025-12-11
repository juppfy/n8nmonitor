import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  maxRequests: number = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "10"),
  windowMs: number = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000")
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

export function getRateLimitHeaders(identifier: string): { "X-RateLimit-Limit": string; "X-RateLimit-Remaining": string; "X-RateLimit-Reset": string } | null {
  const record = rateLimitMap.get(identifier);
  if (!record) return null;

  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "10");
  const remaining = Math.max(0, maxRequests - record.count);
  const resetTime = Math.ceil(record.resetTime / 1000);

  return {
    "X-RateLimit-Limit": maxRequests.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTime.toString(),
  };
}

export function createRateLimitMiddleware(
  maxRequests: number = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "10"),
  windowMs: number = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000")
) {
  return (request: NextRequest) => {
    // Use IP address as identifier (or user ID if authenticated)
    const identifier = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "unknown";
    
    if (!rateLimit(identifier, maxRequests, windowMs)) {
      const headers = getRateLimitHeaders(identifier);
      return NextResponse.json(
        { error: "Too many requests" },
        { 
          status: 429,
          headers: headers || {},
        }
      );
    }

    return null;
  };
}


