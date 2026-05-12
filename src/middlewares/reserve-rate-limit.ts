import { type RequestHandler } from "express";
import { rateLimit, MemoryStore, type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";

import { logger } from "../observability/logger";

const WINDOW_MS = 60 * 1000;
const LIMIT_PER_IP = 5;
const REDIS_URL_DEFAULT = "redis://127.0.0.1:6379";

const sharedLimitOptions: Partial<Options> = {
  windowMs: WINDOW_MS,
  limit: LIMIT_PER_IP,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? "unknown",
  handler: (req, res, _next, options) => {
    res.status(options.statusCode ?? 429).json({
      error: "RATE_LIMIT_EXCEEDED",
      message:
        "Too many reservation attempts from this IP. You can make up to 5 POST /reserve requests per minute.",
      ref: req.correlationId ?? "unknown",
    });
  },
};

/**
 * Builds rate limiter for POST /reserve: Redis when available, else in-memory (with loud log).
 */
export async function buildReserveRateLimiter(): Promise<RequestHandler> {
  const redisUrl = process.env.REDIS_URL ?? REDIS_URL_DEFAULT;

  try {
    const client = createClient({
      url: redisUrl,
      socket: { connectTimeout: 3_000 },
    });

    client.on("error", (err) => {
      logger.error({ err, redisUrl }, "Redis client error (rate limit store)");
    });

    await client.connect();

    logger.info(
      { redisUrl },
      "Connected to Redis for POST /reserve rate limiting (5 req/min per IP)",
    );

    return rateLimit({
      ...sharedLimitOptions,
      store: new RedisStore({
        sendCommand: (...args: string[]) =>
          client.sendCommand(args),
      }),
    });
  } catch (err) {
    logger.error(
      {
        err,
        redisUrl,
        remedy:
          "Start Redis: docker compose up -d redis   (see docker-compose.yml)",
      },
      "Redis is unavailable — cannot use Redis store for POST /reserve rate limit. Falling back to in-memory rate limiting for this process (not shared across instances).",
    );

    return rateLimit({
      ...sharedLimitOptions,
      store: new MemoryStore(),
    });
  }
}
