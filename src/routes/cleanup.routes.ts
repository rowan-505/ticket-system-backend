import { Router } from "express";

import { cleanupExpiredReservations } from "../services/cleanup.service";

export const cleanupRouter = Router();

cleanupRouter.post("/cleanup/expired-reservations", async (_req, res) => {
  const count = await cleanupExpiredReservations();
  res.json({ count });
});
