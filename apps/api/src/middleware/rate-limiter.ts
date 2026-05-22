import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const MAX_ENTRIES = 10000;

const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 2000;

function cleanupExpiredEntries(now: number) {
  if (store.size >= MAX_ENTRIES) {
    const entriesToDelete: string[] = [];
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        entriesToDelete.push(key);
      }
    }
    if (entriesToDelete.length < MAX_ENTRIES / 2) {
      const iterator = store.keys();
      for (let i = 0; i < MAX_ENTRIES / 2; i++) {
        const { value } = iterator.next();
        if (value) entriesToDelete.push(value);
      }
    }
    for (const key of entriesToDelete) {
      store.delete(key);
    }
  } else {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }
}

setInterval(() => {
  cleanupExpiredEntries(Date.now());
}, 30_000).unref();

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  
  if (store.size >= MAX_ENTRIES) {
    cleanupExpiredEntries(now);
  }
  
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS - 1);
    res.setHeader("X-RateLimit-Reset", Math.ceil((now + WINDOW_MS) / 1000));
    next();
    return;
  }

  if (entry.count >= MAX_REQUESTS) {
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader("X-RateLimit-Remaining", 0);
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
    res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
    res.status(429).json({
      message: "Too many requests, please try again later.",
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
    return;
  }

  entry.count++;
  res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
  res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS - entry.count);
  res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
  next();
}