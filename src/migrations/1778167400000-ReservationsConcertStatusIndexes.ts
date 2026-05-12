import { MigrationInterface, QueryRunner } from "typeorm";

export class ReservationsConcertStatusIndexes1778167400000 implements MigrationInterface {
  name = "ReservationsConcertStatusIndexes1778167400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_reservations_concert_id ON reservations ("concertId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_reservations_pending_status ON reservations ("status") WHERE "status" = 'PENDING'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reservations_concert_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reservations_pending_status`);
  }
}
