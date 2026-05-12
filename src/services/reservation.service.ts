import { OptimisticLockVersionMismatchError, QueryFailedError } from "typeorm";

import AppDataSource from "../data-source";
import { Concert } from "../entities/concert.entity";
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../errors/app-error";
import { Reservation, ReservationStatus } from "../entities/reservation.entity";
import type { PurchaseBody, ReserveBody } from "../validation/schemas";

/**
 * SQLite driver shares one QueryRunner for the whole process. Concurrent reservation
 * transactions must be serialized so we never issue nested BEGIN on the same connection.
 */
let reservationWriteTail: Promise<void> = Promise.resolve();

function enqueueReservationWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = reservationWriteTail.then(() => fn());
  reservationWriteTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function isSqliteConcurrencyMessage(text: string): boolean {
  return (
    text.includes("SQLITE_BUSY") ||
    text.includes("SQLITE_LOCKED") ||
    text.includes("cannot start a transaction within a transaction")
  );
}

function mapSqliteReservationFailure(err: unknown): unknown {
  if (err instanceof AppError) {
    return err;
  }

  const fromDriver = (e: unknown): string | undefined => {
    if (e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string") {
      return (e as Error).message;
    }
    return undefined;
  };

  if (err instanceof QueryFailedError) {
    const m = fromDriver(err.driverError) ?? err.message;
    if (m && isSqliteConcurrencyMessage(m)) {
      return new ConflictError(
        "Reservation could not complete due to database contention. Try again.",
        "CONCURRENCY_CONFLICT",
      );
    }
  }

  const msg = err instanceof Error ? err.message : String(err);
  if (isSqliteConcurrencyMessage(msg)) {
    return new ConflictError(
      "Reservation could not complete due to database contention. Try again.",
      "CONCURRENCY_CONFLICT",
    );
  }

  return err;
}

/**
 * Atomically decrements concert stock (single UPDATE), then creates a PENDING reservation.
 * If no row is updated, stock was insufficient or the concert id is invalid (OUT_OF_STOCK).
 */
async function createReservationInTransaction(
  input: ReserveBody,
): Promise<Reservation> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const reservationRepo = queryRunner.manager.getRepository(Reservation);

    const updateResult = await queryRunner.query(
      `UPDATE "concerts" SET "availableStock" = "availableStock" - ?, "version" = "version" + 1 WHERE "id" = ? AND "availableStock" >= ?`,
      [input.quantity, input.concertId, input.quantity],
      true,
    );

    const affected = updateResult.affected ?? 0;
    if (affected === 0) {
      throw new ConflictError(
        "Not enough tickets available for this concert (stock unchanged).",
        "OUT_OF_STOCK",
      );
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const reservation = reservationRepo.create({
      concert: { id: input.concertId } as Concert,
      userId: input.userId,
      quantity: input.quantity,
      status: ReservationStatus.PENDING,
      expiresAt,
    });
    await reservationRepo.save(reservation);

    await queryRunner.commitTransaction();
    return reservation;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw mapSqliteReservationFailure(err);
  } finally {
    await queryRunner.release();
  }
}

export function createReservation(input: ReserveBody): Promise<Reservation> {
  return enqueueReservationWrite(() => createReservationInTransaction(input));
}

/**
 * Testing: optimistic locking on Concert.version — concurrent updates can yield 409.
 */
export async function createReservationOptimistic(
  input: ReserveBody,
): Promise<Reservation> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const concertRepo = queryRunner.manager.getRepository(Concert);
    const reservationRepo = queryRunner.manager.getRepository(Reservation);

    const concert = await concertRepo.findOne({
      where: { id: input.concertId },
    });
    if (!concert) {
      throw new NotFoundError("Concert not found.");
    }
    if (concert.availableStock < input.quantity) {
      throw new ConflictError("Not enough tickets available for this concert.");
    }

    concert.availableStock -= input.quantity;
    await concertRepo.save(concert);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const reservation = reservationRepo.create({
      concert,
      userId: input.userId,
      quantity: input.quantity,
      status: ReservationStatus.PENDING,
      expiresAt,
    });
    await reservationRepo.save(reservation);

    await queryRunner.commitTransaction();
    return reservation;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    if (err instanceof OptimisticLockVersionMismatchError) {
      throw new ConflictError(
        "Concert was updated by another transaction (optimistic version conflict).",
      );
    }
    throw err;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Testing: pessimistic row lock on concert inside a transaction.
 */
export async function createReservationPessimistic(
  input: ReserveBody,
): Promise<Reservation> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const concertRepo = queryRunner.manager.getRepository(Concert);
    const reservationRepo = queryRunner.manager.getRepository(Reservation);

    const concert = await concertRepo.findOne({
      where: { id: input.concertId },
      lock: { mode: "pessimistic_write" },
    });
    if (!concert) {
      throw new NotFoundError("Concert not found.");
    }
    if (concert.availableStock < input.quantity) {
      throw new ConflictError("Not enough tickets available for this concert.");
    }

    concert.availableStock -= input.quantity;
    await concertRepo.save(concert);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const reservation = reservationRepo.create({
      concert,
      userId: input.userId,
      quantity: input.quantity,
      status: ReservationStatus.PENDING,
      expiresAt,
    });
    await reservationRepo.save(reservation);

    await queryRunner.commitTransaction();
    return reservation;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}

function parseTestRollbackBody(body: unknown): Pick<ReserveBody, "concertId" | "quantity"> {
  if (body === null || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const o = body as Record<string, unknown>;
  const concertIdRaw = o.concertId;
  const quantityRaw = o.quantity;

  const concertId =
    typeof concertIdRaw === "number" ? concertIdRaw : Number(concertIdRaw);
  if (!Number.isInteger(concertId) || concertId < 1) {
    throw new ValidationError("concertId must be a positive integer.");
  }

  const quantity =
    typeof quantityRaw === "number" ? quantityRaw : Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
    throw new ValidationError("quantity must be an integer from 1 to 5.");
  }

  return { concertId, quantity };
}

/**
 * Testing only: transaction decreases stock, then fails before inserting a reservation so nothing commits.
 */
export async function runTestReservationRollback(body: unknown): Promise<void> {
  const input = parseTestRollbackBody(body);

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const concertRepo = queryRunner.manager.getRepository(Concert);

    const concert = await concertRepo.findOne({
      where: { id: input.concertId },
    });
    if (!concert) {
      throw new NotFoundError("Concert not found.");
    }
    if (concert.availableStock < input.quantity) {
      throw new ConflictError("Not enough tickets available for this concert.");
    }

    concert.availableStock -= input.quantity;
    await concertRepo.save(concert);

    throw new AppError(
      "TEST_ROLLBACK",
      "Test rollback: the transaction was rolled back. Concert stock was not permanently reduced and no reservation was created.",
      400,
    );
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}

export async function purchaseReservation(
  input: PurchaseBody,
): Promise<Reservation> {
  const { reservationId } = input;

  const repo = AppDataSource.getRepository(Reservation);
  const reservation = await repo.findOne({ where: { id: reservationId } });

  if (!reservation) {
    throw new NotFoundError("Reservation not found.");
  }
  if (reservation.status !== ReservationStatus.PENDING) {
    throw new ConflictError("This reservation is not pending and cannot be purchased.");
  }
  if (reservation.expiresAt.getTime() < Date.now()) {
    throw new ConflictError("This reservation has expired.");
  }

  reservation.status = ReservationStatus.COMPLETED;
  return repo.save(reservation);
}
