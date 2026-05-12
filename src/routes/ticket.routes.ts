import { Router } from "express";

import { validateBody } from "../middlewares/validate-body";
import { createTicketBodySchema } from "../validation/schemas";
import { listTickets, createTicket } from "../services/ticket.service";

export const ticketRouter = Router();

ticketRouter.get("/", async (_req, res) => {
  const tickets = await listTickets();
  res.json(tickets);
});

ticketRouter.post(
  "/",
  validateBody(createTicketBodySchema),
  async (req, res) => {
    const ticket = await createTicket(req.body);
    res.status(201).json({
      id: ticket.id,
      concertId: ticket.concert.id,
      category: ticket.category,
      internalNote: ticket.internalNote,
      version: ticket.version,
    });
  },
);
