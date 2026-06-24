import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `campaigns` and `campaign_recipients` tables with all
 * columns, indexes, and foreign key relationships.
 *
 * SQLite notes:
 *   - `simple-json` columns store JSON as TEXT (jsonColumnType helper)
 *   - `text` columns with DateTransformer handle timestamps
 *   - SQLite 3.25+ supports RENAME COLUMN, so ALTER TABLE is available
 *   - `jsonColumnType()` returns `simple-json` for SQLite, `jsonb` for Postgres
 *   - `dateColumnType()` returns `text` for SQLite, `timestamp` for Postgres
 */
export class AddCampaignTables1783000000000 implements MigrationInterface {
  name = 'AddCampaignTables1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type === 'postgres') {
      await this.upPostgres(queryRunner);
    } else {
      await this.upSqlite(queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type === 'postgres') {
      await this.downPostgres(queryRunner);
    } else {
      await this.downSqlite(queryRunner);
    }
  }

  // ──────────────────────────────────────────────
  //  SQLite
  // ──────────────────────────────────────────────

  private async upSqlite(queryRunner: QueryRunner): Promise<void> {
    // campaigns table
    await queryRunner.query(
      `CREATE TABLE "campaigns" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar NOT NULL,
        "description" text,
        "session_id" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT ('draft'),
        "recipient_type" varchar NOT NULL DEFAULT ('contacts'),
        "recipientIds" text,
        "total_recipients" integer NOT NULL DEFAULT (0),
        "messageContent" text NOT NULL,
        "schedule_at" datetime,
        "started_at" datetime,
        "completed_at" datetime,
        "sent_count" integer NOT NULL DEFAULT (0),
        "failed_count" integer NOT NULL DEFAULT (0),
        "current_index" integer NOT NULL DEFAULT (0),
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaigns_status_created" ON "campaigns" ("status", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaigns_schedule_at" ON "campaigns" ("schedule_at")`,
    );

    // campaign_recipients table
    await queryRunner.query(
      `CREATE TABLE "campaign_recipients" (
        "id" varchar PRIMARY KEY NOT NULL,
        "campaign_id" varchar NOT NULL,
        "chat_id" varchar NOT NULL,
        "recipient_name" varchar,
        "contact_id" varchar,
        "group_id" varchar,
        "status" varchar NOT NULL DEFAULT ('pending'),
        "message_id" varchar,
        "error_message" text,
        "sent_at" datetime,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_campaign_recipients_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_recipients_campaign_id" ON "campaign_recipients" ("campaign_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_recipients_campaign_status" ON "campaign_recipients" ("campaign_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_recipients_campaign_chat" ON "campaign_recipients" ("campaign_id", "chat_id")`,
    );
  }

  private async downSqlite(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_campaign_recipients_campaign_chat"`);
    await queryRunner.query(`DROP INDEX "IDX_campaign_recipients_campaign_status"`);
    await queryRunner.query(`DROP INDEX "IDX_campaign_recipients_campaign_id"`);
    await queryRunner.query(`DROP TABLE "campaign_recipients"`);
    await queryRunner.query(`DROP INDEX "IDX_campaigns_schedule_at"`);
    await queryRunner.query(`DROP INDEX "IDX_campaigns_status_created"`);
    await queryRunner.query(`DROP TABLE "campaigns"`);
  }

  // ──────────────────────────────────────────────
  //  PostgreSQL
  // ──────────────────────────────────────────────

  private async upPostgres(queryRunner: QueryRunner): Promise<void> {
    // campaigns table
    await queryRunner.query(
      `CREATE TABLE "campaigns" (
        "id" varchar PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::varchar,
        "name" varchar NOT NULL,
        "description" text,
        "session_id" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'draft',
        "recipient_type" varchar NOT NULL DEFAULT 'contacts',
        "recipientIds" jsonb,
        "total_recipients" integer NOT NULL DEFAULT 0,
        "messageContent" jsonb NOT NULL,
        "schedule_at" timestamp,
        "started_at" timestamp,
        "completed_at" timestamp,
        "sent_count" integer NOT NULL DEFAULT 0,
        "failed_count" integer NOT NULL DEFAULT 0,
        "current_index" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT NOW(),
        "updated_at" timestamp NOT NULL DEFAULT NOW()
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaigns_status_created" ON "campaigns" ("status", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaigns_schedule_at" ON "campaigns" ("schedule_at")`,
    );

    // campaign_recipients table
    await queryRunner.query(
      `CREATE TABLE "campaign_recipients" (
        "id" varchar PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::varchar,
        "campaign_id" varchar NOT NULL,
        "chat_id" varchar NOT NULL,
        "recipient_name" varchar,
        "contact_id" varchar,
        "group_id" varchar,
        "status" varchar NOT NULL DEFAULT 'pending',
        "message_id" varchar,
        "error_message" text,
        "sent_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_campaign_recipients_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_recipients_campaign_id" ON "campaign_recipients" ("campaign_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_recipients_campaign_status" ON "campaign_recipients" ("campaign_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_recipients_campaign_chat" ON "campaign_recipients" ("campaign_id", "chat_id")`,
    );
  }

  private async downPostgres(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_campaign_recipients_campaign_chat"`);
    await queryRunner.query(`DROP INDEX "IDX_campaign_recipients_campaign_status"`);
    await queryRunner.query(`DROP INDEX "IDX_campaign_recipients_campaign_id"`);
    await queryRunner.query(`DROP TABLE "campaign_recipients"`);
    await queryRunner.query(`DROP INDEX "IDX_campaigns_schedule_at"`);
    await queryRunner.query(`DROP INDEX "IDX_campaigns_status_created"`);
    await queryRunner.query(`DROP TABLE "campaigns"`);
  }
}
