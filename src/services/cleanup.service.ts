import { LessThan } from "typeorm";

import AppDataSource from "../data-source";
import { Concert } from "../entities/concert.entity";
import { Reservation, ReservationStatus } from "../entities/reservation.entity";

/**
 * Marks stale PENDING reservations as EXPIRED and restores stock on their concerts.
 * Runs in a single transaction.
 */
export async function cleanupExpiredReservations(): Promise<number> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const reservationRepo = queryRunner.manager.getRepository(Reservation);
    const concertRepo = queryRunner.manager.getRepository(Concert);
    const now = new Date();

    const expired = await reservationRepo.find({
      where: {
        status: ReservationStatus.PENDING,
        expiresAt: LessThan(now),
      },
      relations: { concert: true },
    });

    for (const reservation of expired) {
      reservation.status = ReservationStatus.EXPIRED;
      reservation.concert.availableStock += reservation.quantity;
      await reservationRepo.save(reservation);
      await concertRepo.save(reservation.concert);
    }

    await queryRunner.commitTransaction();
    return expired.length;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
