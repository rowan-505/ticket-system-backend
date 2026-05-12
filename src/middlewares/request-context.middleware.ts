import { randomUUID } from "node:crypto";

import type { RequestHandler } from "express";

import { logger } from "../observability/logger";
import { requestContext } from "../observability/request-context";

const MAX_CORRELATION_ID_LENGTH = 128;

function resolveCorrelationId(headerValue: unknown): string {
  if (typeof headerValue === "string") {
    const trimmed = headerValue.trim();
    if (trimmed.length > 0) {
      return trimmed.length > MAX_CORRELATION_ID_LENGTH
        ? trimmed.slice(0, MAX_CORRELATION_ID_LENGTH)
        : trimmed;
    }
  }
  return randomUUID();
}

/**
 * Binds X-Correlation-ID (or a new UUID) to the request and AsyncLocalStorage
 * so Pino logs automatically include correlation_id for this request.
 */
export const requestContextMiddleware: RequestHandler = (req, res, next) => {
  const correlationId = resolveCorrelationId(req.headers["x-correlation-id"]);
  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);

  requestContext.run({ correlationId }, () => {
    logger.info(
      {
        method: req.method,
        path: req.originalUrl ?? req.url,
      },
      "request received",
    );
    next();
  });
};
