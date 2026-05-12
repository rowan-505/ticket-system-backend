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

function scheduleDestroyAndExit(httpExitCode: number): void {
  logger.info(
    "shutdown: waiting 5 seconds before database teardown for pending work",
  );
  setTimeout(async () => {
    let exitCode = httpExitCode;
    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        logger.info("shutdown: TypeORM data source destroyed");
      }
    } catch (err) {
      logger.error({ err }, "shutdown: failed to destroy data source");
      exitCode = 1;
    }
    if (isSentryEnabled()) {
      await Sentry.flush(2_000);
    }
    logger.info({ exitCode }, "shutdown: process exit");
    process.exit(exitCode);
  }, 5000);
}

function gracefulShutdown(server: http.Server, signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.info(
    { signal },
    "shutdown: signal received, closing HTTP server (no new connections)",
  );

  server.close((closeErr) => {
    if (closeErr) {
      logger.error({ err: closeErr }, "shutdown: error closing HTTP server");
    } else {
      logger.info("shutdown: HTTP server closed");
    }
    scheduleDestroyAndExit(closeErr ? 1 : 0);
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
