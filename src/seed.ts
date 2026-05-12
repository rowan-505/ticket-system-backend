import "reflect-metadata";

import type { Repository } from "typeorm";

import AppDataSource from "./data-source";
import { Concert } from "./entities/concert.entity";
import { Ticket } from "./entities/ticket.entity";

const DEMO_LOW_STOCK_NAME = "Low-stock concert (concurrency demo)";
const DEMO_STANDARD_NAME = "Standard concert";
const DEMO_LOW_STOCK = 1;
const DEMO_STANDARD_STOCK = 10;

/** Stable marker for the idempotent sample ticket (never exposed on GET /tickets). */
const SAMPLE_TICKET_INTERNAL_NOTE = "This should never appear in GET /tickets";

async function upsertConcertByName(
  repo: Repository<Concert>,
  name: string,
  availableStock: number,
): Promise<Concert> {
  const existing = await repo.findOne({ where: { name } });
  if (existing) {
    existing.availableStock = availableStock;
    return repo.save(existing);
  }
  return repo.save(repo.create({ name, availableStock }));
}

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  try {
    const concertRepo = AppDataSource.getRepository(Concert);
    const ticketRepo = AppDataSource.getRepository(Ticket);

    const lowStockConcert = await upsertConcertByName(
      concertRepo,
      DEMO_LOW_STOCK_NAME,
      DEMO_LOW_STOCK,
    );
    const standardConcert = await upsertConcertByName(
      concertRepo,
      DEMO_STANDARD_NAME,
      DEMO_STANDARD_STOCK,
    );

    let sampleTicket = await ticketRepo.findOne({
      where: { internalNote: SAMPLE_TICKET_INTERNAL_NOTE },
      relations: { concert: true },
    });

    if (sampleTicket) {
      sampleTicket.category = "General";
      sampleTicket.internalNote = SAMPLE_TICKET_INTERNAL_NOTE;
      sampleTicket.concert = standardConcert;
      await ticketRepo.save(sampleTicket);
    } else {
      sampleTicket = ticketRepo.create({
        concert: standardConcert,
        category: "General",
        internalNote: SAMPLE_TICKET_INTERNAL_NOTE,
      });
      await ticketRepo.save(sampleTicket);
    }

    console.log(
      `Seed complete: "${DEMO_LOW_STOCK_NAME}" availableStock=${lowStockConcert.availableStock}, "${DEMO_STANDARD_NAME}" availableStock=${standardConcert.availableStock}, sample ticket id=${sampleTicket.id} (category General, Standard concert).`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
