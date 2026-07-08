import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline migration for tables that existed only via `synchronize: true`
 * and were never captured by an earlier migration: users, contacts,
 * countries/states/cities, groups/group_members, system_settings.
 *
 * Dated before every other migration so a fresh/empty database builds the
 * full schema in order. Column shapes are taken from the current entities
 * (via `typeorm migration:generate` against an empty reference DB, then
 * hand-trimmed to just these tables — the generator's raw output also
 * rebuilt several already-correct tables due to incidental type-diffing
 * noise, which this migration intentionally does not touch).
 */
export class CreateBaselineTables1700000000000 implements MigrationInterface {
  name = 'CreateBaselineTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "countries" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(100) NOT NULL, "code" varchar(2) NOT NULL, "dialCode" varchar(10) NOT NULL, "flag" varchar(10), "iso3" varchar(100), "capital" varchar(100), "currency" varchar(100), "region" varchar(100), "subregion" varchar(100))`,
    );
    await queryRunner.query(
      `CREATE TABLE "states" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(100) NOT NULL, "stateCode" varchar(10), "countryId" integer NOT NULL, CONSTRAINT "FK_76ac7edf8f44e80dff569db7321" FOREIGN KEY ("countryId") REFERENCES "countries" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE TABLE "cities" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(100) NOT NULL, "stateId" integer NOT NULL, CONSTRAINT "FK_ded8a17cd090922d5bac8a2361f" FOREIGN KEY ("stateId") REFERENCES "states" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );

    await queryRunner.query(
      `CREATE TABLE "users" ("id" varchar PRIMARY KEY NOT NULL, "phone" varchar(20) NOT NULL, "password" varchar(255) NOT NULL, "name" varchar(100) NOT NULL, "role" varchar(20) NOT NULL DEFAULT ('operator'), "isActive" boolean NOT NULL DEFAULT (1), "profilePic" varchar(255), "lastLoginAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a000cca60bcf04454e72769949" ON "users" ("phone")`);

    await queryRunner.query(
      `CREATE TABLE "system_settings" ("id" varchar PRIMARY KEY NOT NULL, "businessLogo" varchar(255), "smallLogo" varchar(255), "email" varchar(255), "altPhone" varchar(20), "website" varchar(255), "name" varchar(100), "address" varchar(500), "googleMapLink" varchar(500), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`,
    );

    await queryRunner.query(
      `CREATE TABLE "groups" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar(100) NOT NULL, "description" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_664ea405ae2a10c264d582ee56" ON "groups" ("name")`);

    await queryRunner.query(
      `CREATE TABLE "contacts" ("id" varchar PRIMARY KEY NOT NULL, "fullName" varchar(100), "phone" varchar(20) NOT NULL, "countryCode" varchar(10) NOT NULL DEFAULT ('+60'), "countryId" integer, "stateId" integer, "cityId" integer, "address" varchar(255), "note" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_37c7a529302085865a7167a053e" FOREIGN KEY ("countryId") REFERENCES "countries" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_9be2c8a69d8686fb9b33df4955a" FOREIGN KEY ("stateId") REFERENCES "states" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_c201ec50615be39c20fbc5bc039" FOREIGN KEY ("cityId") REFERENCES "cities" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_84cae51c485079bdd8cdf1d828" ON "contacts" ("phone")`);

    await queryRunner.query(
      `CREATE TABLE "group_members" ("contactId" varchar NOT NULL, "groupId" varchar NOT NULL, CONSTRAINT "FK_14e89c19ee452d7f37bfa5872b6" FOREIGN KEY ("contactId") REFERENCES "contacts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_1aa8d31831c3126947e7a713c2b" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, PRIMARY KEY ("contactId", "groupId"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "group_members"`);
    await queryRunner.query(`DROP INDEX "IDX_84cae51c485079bdd8cdf1d828"`);
    await queryRunner.query(`DROP TABLE "contacts"`);
    await queryRunner.query(`DROP INDEX "IDX_664ea405ae2a10c264d582ee56"`);
    await queryRunner.query(`DROP TABLE "groups"`);
    await queryRunner.query(`DROP TABLE "system_settings"`);
    await queryRunner.query(`DROP INDEX "IDX_a000cca60bcf04454e72769949"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "cities"`);
    await queryRunner.query(`DROP TABLE "states"`);
    await queryRunner.query(`DROP TABLE "countries"`);
  }
}
