import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRbacTables1782991404470 implements MigrationInterface {
    name = 'AddRbacTables1782991404470';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Permissions table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "permissions" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(100) NOT NULL,
                "group" varchar(50) NOT NULL,
                "description" varchar(255),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_PERMISSIONS_NAME" ON "permissions" ("name")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_PERMISSIONS_GROUP" ON "permissions" ("group")`);

        // Roles table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar(50) NOT NULL,
                "description" varchar(255),
                "isSystem" boolean NOT NULL DEFAULT (0),
                "isActive" boolean NOT NULL DEFAULT (1),
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ROLES_NAME" ON "roles" ("name")`);

        // Role-Permissions join table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "role_permissions" (
                "roleId" varchar NOT NULL,
                "permissionId" varchar NOT NULL,
                PRIMARY KEY ("roleId", "permissionId"),
                FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE,
                FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ROLE_PERMISSIONS_ROLE" ON "role_permissions" ("roleId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ROLE_PERMISSIONS_PERMISSION" ON "role_permissions" ("permissionId")`);

        // User-Roles join table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "user_roles" (
                "id" varchar PRIMARY KEY NOT NULL,
                "userId" varchar(36) NOT NULL,
                "roleId" varchar(36) NOT NULL,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
                FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_USER_ROLES_USER" ON "user_roles" ("userId")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_USER_ROLES_ROLE" ON "user_roles" ("roleId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
    }
}
