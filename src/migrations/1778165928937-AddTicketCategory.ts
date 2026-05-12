import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketCategory1778165928937 implements MigrationInterface {
  name = "AddTicketCategory1778165928937";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns: Array<{ name: string }> = await queryRunner.query(
      `PRAGMA table_info("tickets")`,
    );
    const hasCategory = columns.some((c) => c.name === "category");
    if (!hasCategory) {
      await queryRunner.query(
        `ALTER TABLE "tickets" ADD COLUMN "category" text`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // SQLite: dropping a column requires rebuilding the table; omitted for this demo.
  }
}
