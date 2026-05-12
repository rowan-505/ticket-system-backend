import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReservationIndexes1778166160874 implements MigrationInterface {
  name = "AddReservationIndexes1778166160874";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // SQLite: default user-defined indexes are B-tree.
    await queryRunner.query(
      `CREATE INDEX "idx_reservations_concertId" ON "reservations" ("concertId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reservations_status_pending" ON "reservations" ("status") WHERE "status" = 'PENDING'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reservations_status_pending"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reservations_concertId"`);
  }
}
