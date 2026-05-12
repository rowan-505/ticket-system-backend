import AppDataSource from "../data-source";
import { Concert } from "../entities/concert.entity";
import { Ticket } from "../entities/ticket.entity";
import { type TicketListItemDto, toTicketListItemDto } from "../dto/ticket.dto";
import { NotFoundError } from "../errors/app-error";
import type { CreateTicketBody } from "../validation/schemas";

export async function listTickets(): Promise<TicketListItemDto[]> {
  const ticketRepo = AppDataSource.getRepository(Ticket);
  const tickets = await ticketRepo.find({
    relations: { concert: true },
    order: { id: "ASC" },
  });
  return tickets.map(toTicketListItemDto);
}

export async function createTicket(input: CreateTicketBody): Promise<Ticket> {
  const ticketRepo = AppDataSource.getRepository(Ticket);
  const concertRepo = AppDataSource.getRepository(Concert);

  const concert = await concertRepo.findOne({ where: { id: input.concertId } });
  if (!concert) {
    throw new NotFoundError("Concert not found.");
  }

  const ticket = ticketRepo.create({
    concert,
    category: input.category ?? null,
    internalNote: input.internalNote ?? null,
  });

  return ticketRepo.save(ticket);
}
