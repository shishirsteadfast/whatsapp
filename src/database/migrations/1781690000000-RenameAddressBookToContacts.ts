import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAddressBookToContacts1781690000000 implements MigrationInterface {
  name = 'RenameAddressBookToContacts1781690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ALTER TABLE RENAME works identically on SQLite and PostgreSQL.
    // SQLite also updates index references automatically.
    await queryRunner.query(`ALTER TABLE "address_book" RENAME TO "contacts"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contacts" RENAME TO "address_book"`);
  }
}
