import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { isAppError } from "../errors/app-error";
import { logger } from "../observability/logger";

function formatZodIssues(err: ZodError): string {
  return err.issues
    .map((i) => {
      const path = i.path.length > 0 ? `${i.path.join(".")}: ` : "";
      return `${path}${i.message}`;
    })
    .join("; ");
}

export const errorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  _next,
) => {
  const ref = req.correlationId ?? "unknown";

  if (err instanceof ZodError) {
    logger.warn(
      {
        correlation_id: ref,
        validationIssues: err.flatten(),
        issueMessages: err.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      },
      "validation error",
    );
    const message = formatZodIssues(err);
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message,
      ref,
    });
    return;
  }

  if (isAppError(err)) {
    if (err.code === "VALIDATION_ERROR") {
      logger.warn(
        { correlation_id: ref, code: err.code, message: err.message },
        "validation error",
      );
    }
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      ref,
    });
    return;
  }

  logger.error(
    {
      correlation_id: ref,
      stack: err instanceof Error ? err.stack : undefined,
      err:
        err instanceof Error
          ? { name: err.name, message: err.message }
          : err,
    },
    "unhandled error",
  );

  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again later.",
    ref,
  });
};
