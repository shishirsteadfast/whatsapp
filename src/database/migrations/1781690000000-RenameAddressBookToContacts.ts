import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAddressBookToContacts1781690000000 implements MigrationInterface {
  name = 'RenameAddressBookToContacts1781690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Databases built from the baseline migration (or already-migrated ones)
    // never had "address_book" — "contacts" is created directly. Only rename
    // on older databases that still have the pre-rename table.
    const hasAddressBook = await queryRunner.hasTable('address_book');
    if (!hasAddressBook) return;

    // SQLite's ALTER TABLE RENAME also updates index references automatically.
    await queryRunner.query(`ALTER TABLE "address_book" RENAME TO "contacts"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contacts" RENAME TO "address_book"`);
  }
}
