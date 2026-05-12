import "reflect-metadata";
import "dotenv/config";
import "./instrument-sentry";

import http from "node:http";

import * as Sentry from "@sentry/node";

import AppDataSource from "./data-source";
import { createApp } from "./app";
import { isSentryEnabled } from "./instrument-sentry";
import { logger } from "./observability/logger";

const port = Number(process.env.PORT) || 3000;

let shuttingDown = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function teardownAfterHttpClosed(httpCloseFailed: boolean): Promise<void> {
  logger.info("waiting 5 seconds for pending requests/database work");
  await sleep(5000);

  logger.info("closing database connection");
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    if (isSentryEnabled()) {
      await Sentry.flush(2_000);
    }
    logger.info("shutdown complete");
    process.exit(httpCloseFailed ? 1 : 0);
  } catch (err) {
    logger.error({ err }, "shutdown failed");
    process.exit(1);
  }
}

function gracefulShutdown(server: http.Server, signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.info({ signal }, "shutdown signal received");
  logger.info("closing HTTP server");

  server.close((closeErr) => {
    if (closeErr) {
      logger.error({ err: closeErr }, "error while closing HTTP server");
    }
    void teardownAfterHttpClosed(Boolean(closeErr));
  });
}

async function main(): Promise<void> {
  await AppDataSource.initialize();

  const app = await createApp();
  const server = http.createServer(app);

  server.listen(port, () => {
    logger.info({ port }, "server listening");
  });

  process.once("SIGTERM", () => gracefulShutdown(server, "SIGTERM"));
  process.once("SIGINT", () => gracefulShutdown(server, "SIGINT"));
}

main().catch((err: unknown) => {
  logger.error({ err }, "server failed to start");
  process.exit(1);
});
