import pino from "pino";

import { requestContext } from "./request-context";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  mixin() {
    const store = requestContext.getStore();
    if (!store) {
      return {};
    }
    return { correlation_id: store.correlationId };
  },
});
