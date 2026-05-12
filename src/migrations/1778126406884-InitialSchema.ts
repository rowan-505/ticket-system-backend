import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1778126406884 implements MigrationInterface {
    name = 'InitialSchema1778126406884'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "concerts" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" text NOT NULL, "availableStock" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "category" text, "internal_note" text, "version" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "concertId" integer)`);
        await queryRunner.query(`CREATE TABLE "reservations" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" text NOT NULL, "quantity" integer NOT NULL, "status" varchar CHECK( "status" IN ('PENDING','COMPLETED','EXPIRED') ) NOT NULL DEFAULT ('PENDING'), "expiresAt" datetime NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "concertId" integer)`);
        await queryRunner.query(`CREATE TABLE "temporary_tickets" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "category" text, "internal_note" text, "version" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "concertId" integer, CONSTRAINT "FK_229003a8365ef3e75e122cab4bc" FOREIGN KEY ("concertId") REFERENCES "concerts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_tickets"("id", "category", "internal_note", "version", "createdAt", "updatedAt", "concertId") SELECT "id", "category", "internal_note", "version", "createdAt", "updatedAt", "concertId" FROM "tickets"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`ALTER TABLE "temporary_tickets" RENAME TO "tickets"`);
        await queryRunner.query(`CREATE TABLE "temporary_reservations" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" text NOT NULL, "quantity" integer NOT NULL, "status" varchar CHECK( "status" IN ('PENDING','COMPLETED','EXPIRED') ) NOT NULL DEFAULT ('PENDING'), "expiresAt" datetime NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "concertId" integer, CONSTRAINT "FK_5d7382c01ba60ba2b99c50114aa" FOREIGN KEY ("concertId") REFERENCES "concerts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_reservations"("id", "userId", "quantity", "status", "expiresAt", "createdAt", "updatedAt", "concertId") SELECT "id", "userId", "quantity", "status", "expiresAt", "createdAt", "updatedAt", "concertId" FROM "reservations"`);
        await queryRunner.query(`DROP TABLE "reservations"`);
        await queryRunner.query(`ALTER TABLE "temporary_reservations" RENAME TO "reservations"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" RENAME TO "temporary_reservations"`);
        await queryRunner.query(`CREATE TABLE "reservations" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" text NOT NULL, "quantity" integer NOT NULL, "status" varchar CHECK( "status" IN ('PENDING','COMPLETED','EXPIRED') ) NOT NULL DEFAULT ('PENDING'), "expiresAt" datetime NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "concertId" integer)`);
        await queryRunner.query(`INSERT INTO "reservations"("id", "userId", "quantity", "status", "expiresAt", "createdAt", "updatedAt", "concertId") SELECT "id", "userId", "quantity", "status", "expiresAt", "createdAt", "updatedAt", "concertId" FROM "temporary_reservations"`);
        await queryRunner.query(`DROP TABLE "temporary_reservations"`);
        await queryRunner.query(`ALTER TABLE "tickets" RENAME TO "temporary_tickets"`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "category" text, "internal_note" text, "version" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "concertId" integer)`);
        await queryRunner.query(`INSERT INTO "tickets"("id", "category", "internal_note", "version", "createdAt", "updatedAt", "concertId") SELECT "id", "category", "internal_note", "version", "createdAt", "updatedAt", "concertId" FROM "temporary_tickets"`);
        await queryRunner.query(`DROP TABLE "temporary_tickets"`);
        await queryRunner.query(`DROP TABLE "reservations"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TABLE "concerts"`);
    }

}
