import "reflect-metadata";

import AppDataSource from "./data-source";
import { Concert } from "./entities/concert.entity";

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  try {
    const concertRepo = AppDataSource.getRepository(Concert);
    const existing = await concertRepo.count();
    if (existing > 0) {
      console.log("Seed skipped: concerts table is not empty.");
      return;
    }

    await concertRepo.save([
      concertRepo.create({
        name: "Low-stock concert (concurrency demo)",
        availableStock: 1,
      }),
      concertRepo.create({
        name: "Standard concert",
        availableStock: 10,
      }),
    ]);

    console.log("Seeded 2 concerts (availableStock: 1 and 10).");
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
