import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContextStore = {
  correlationId: string;
};

export const requestContext = new AsyncLocalStorage<RequestContextStore>();
