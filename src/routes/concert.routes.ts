import { Router } from "express";

import AppDataSource from "../data-source";
import { Concert } from "../entities/concert.entity";

export const concertRouter = Router();

concertRouter.get("/", async (_req, res) => {
  const repo = AppDataSource.getRepository(Concert);
  const concerts = await repo.find({
    select: ["id", "name", "availableStock"],
    order: { id: "ASC" },
  });
  res.json(concerts);
});
