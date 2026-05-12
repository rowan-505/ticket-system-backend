import express from "express";
import * as Sentry from "@sentry/node";
import swaggerUi from "swagger-ui-express";
import { ZodError } from "zod";

import { isAppError } from "./errors/app-error";
import { buildReserveRateLimiter } from "./middlewares/reserve-rate-limit";
import { requestContextMiddleware } from "./middlewares/request-context.middleware";
import { errorHandler } from "./middlewares/error-handler";
import { cleanupRouter } from "./routes/cleanup.routes";
import { concertRouter } from "./routes/concert.routes";
import { healthRouter } from "./routes/health.routes";
import { createReservationRouter } from "./routes/reservation.routes";
import { ticketRouter } from "./routes/ticket.routes";
import { getSwaggerSpec } from "./swagger/build-spec";

export async function createApp(): Promise<express.Express> {
  const app = express();
  app.use(express.json());
  app.use(requestContextMiddleware);
  app.use(healthRouter);
  app.use("/concerts", concertRouter);
  app.use("/tickets", ticketRouter);

  const reserveRateLimiter = await buildReserveRateLimiter();
  app.use(createReservationRouter(reserveRateLimiter));

  app.use(cleanupRouter);

  const swaggerSpec = getSwaggerSpec();
  const swaggerUiMiddleware = swaggerUi.setup(swaggerSpec);

  app.get("/openapi.json", (_req, res) => {
    res.status(200).type("application/json").send(swaggerSpec);
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUiMiddleware);
  app.use("/docs", swaggerUi.serve, swaggerUiMiddleware);

  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app, {
      shouldHandleError(error) {
        if (error instanceof ZodError) {
          return false;
        }
        if (isAppError(error)) {
          return false;
        }
        return true;
      },
    });
  }

  app.use(errorHandler);
  return app;
}
