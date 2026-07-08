import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames apiKeyId → userId and apiKeyName → userName in audit_logs.
 *
 * The initial migration (1770108659848) created columns named apiKeyId/apiKeyName,
 * but the entity was later refactored to userId/userName. With synchronize now
 * defaulting to false, we need an explicit migration to align the schema.
 *
 * SQLite 3.25.0+ supports RENAME COLUMN; the sqlite3 npm package bundles 3.43+.
 */
export class AlignAuditLogColumns1782000000000 implements MigrationInterface {
  name = 'AlignAuditLogColumns1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "apiKeyId" TO "userId"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "apiKeyName" TO "userName"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "userId" TO "apiKeyId"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "userName" TO "apiKeyName"`);
  }
}
