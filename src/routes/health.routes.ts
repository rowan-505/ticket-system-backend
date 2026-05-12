import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

healthRouter.get("/test-error", () => {
  throw new Error("Sentry test error (intentional)");
});
