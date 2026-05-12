import { z } from "zod";

export const reserveBodySchema = z
  .object({
    concertId: z.number().int().positive(),
    userId: z.string().min(1).transform((s) => s.trim()),
    quantity: z.number().int().min(1).max(5),
  })
  .strict();

export type ReserveBody = z.infer<typeof reserveBodySchema>;

export const purchaseBodySchema = z
  .object({
    reservationId: z.number().int().positive(),
  })
  .strict();

export type PurchaseBody = z.infer<typeof purchaseBodySchema>;

export const createTicketBodySchema = z
  .object({
    concertId: z.number().int().positive(),
    category: z.string().nullable().optional(),
    internalNote: z.string().nullable().optional(),
  })
  .strict();

export type CreateTicketBody = z.infer<typeof createTicketBodySchema>;
