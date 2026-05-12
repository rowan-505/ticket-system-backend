import type { Ticket } from "../entities/ticket.entity";

/** Public ticket shape for list/detail APIs (no internal fields). */
export type TicketListItemDto = {
  id: number;
  concertId: number;
  category: string | null;
  createdAt: string;
};

export function toTicketListItemDto(ticket: Ticket): TicketListItemDto {
  const createdAt =
    ticket.createdAt instanceof Date
      ? ticket.createdAt
      : new Date(ticket.createdAt);

  return {
    id: ticket.id,
    concertId: ticket.concert.id,
    category: ticket.category,
    createdAt: createdAt.toISOString(),
  };
}
