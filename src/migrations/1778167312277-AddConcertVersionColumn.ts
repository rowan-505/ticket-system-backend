import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConcertVersionColumn1778167312277 implements MigrationInterface {
  name = "AddConcertVersionColumn1778167312277";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "concerts" ADD COLUMN "version" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite cannot DROP COLUMN without table rebuild; omitted for bootcamp simplicity.
  }
}
