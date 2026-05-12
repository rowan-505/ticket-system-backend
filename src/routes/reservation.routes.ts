import { Router } from "express";
import type { RequestHandler } from "express";

import { validateBody } from "../middlewares/validate-body";
import {
  purchaseBodySchema,
  reserveBodySchema,
} from "../validation/schemas";
import {
  createReservation,
  createReservationOptimistic,
  createReservationPessimistic,
  purchaseReservation,
  runTestReservationRollback,
} from "../services/reservation.service";

export function createReservationRouter(
  reserveRateLimiter: RequestHandler,
): Router {
  const reservationRouter = Router();

  reservationRouter.post("/reserve/test-rollback", async (req, _res) => {
    await runTestReservationRollback(req.body);
  });

  reservationRouter.post(
    "/reserve/optimistic",
    validateBody(reserveBodySchema),
    async (req, res) => {
      const reservation = await createReservationOptimistic(req.body);
      res.status(201).json({
        id: reservation.id,
        concertId: reservation.concert.id,
        userId: reservation.userId,
        quantity: reservation.quantity,
        status: reservation.status,
        expiresAt: reservation.expiresAt,
      });
    },
  );

  reservationRouter.post(
    "/reserve/pessimistic",
    validateBody(reserveBodySchema),
    async (req, res) => {
      const reservation = await createReservationPessimistic(req.body);
      res.status(201).json({
        id: reservation.id,
        concertId: reservation.concert.id,
        userId: reservation.userId,
        quantity: reservation.quantity,
        status: reservation.status,
        expiresAt: reservation.expiresAt,
      });
    },
  );

  reservationRouter.post(
    "/reserve",
    reserveRateLimiter,
    validateBody(reserveBodySchema),
    async (req, res) => {
      const reservation = await createReservation(req.body);
      res.status(201).json({
        id: reservation.id,
        concertId: reservation.concert.id,
        userId: reservation.userId,
        quantity: reservation.quantity,
        status: reservation.status,
        expiresAt: reservation.expiresAt,
      });
    },
  );

  reservationRouter.post(
    "/purchase",
    validateBody(purchaseBodySchema),
    async (req, res) => {
      const reservation = await purchaseReservation(req.body);
      res.json({
        id: reservation.id,
        status: reservation.status,
      });
    },
  );

  return reservationRouter;
}
