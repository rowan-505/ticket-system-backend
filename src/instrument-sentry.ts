import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    integrations: [Sentry.expressIntegration()],
    tracesSampleRate: 0,
  });
}

export function isSentryEnabled(): boolean {
  return Boolean(dsn);
}
