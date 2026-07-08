/**
 * `migrate:fresh` — Laravel-style destructive reset for the SQLite database.
 *
 * Deletes the SQLite database file entirely, re-runs every migration from
 * scratch, and (with --seed) boots the Nest application context so every
 * module's existing idempotent `onModuleInit` seeder runs (default admin
 * user, RBAC permissions/roles, locations) — no seed logic is duplicated
 * here, it reuses exactly what already runs on a normal empty-DB boot.
 *
 * Usage:
 *   npm run migrate:fresh                  interactive confirmation, no seed
 *   npm run migrate:fresh -- --seed        interactive confirmation, then seed
 *   npm run migrate:fresh -- --force       skip confirmation (CI/non-interactive)
 *   npm run db:seed                        seed only, no drop/migrate
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import dataSource from './data-source';

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    seed: args.includes('--seed'),
    seedOnly: args.includes('--seed-only'),
    force: args.includes('--force') || args.includes('-f'),
  };
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

async function seedViaAppContext(): Promise<void> {
  console.log('Seeding database (booting application context)...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  await app.close();
  console.log('Seeding complete.');
}

async function main() {
  const { seed, seedOnly, force } = parseArgs();

  if (seedOnly) {
    await seedViaAppContext();
    return;
  }

  const dbPath = dataSource.options.database as string;
  const absPath = path.resolve(dbPath);

  if (process.env.NODE_ENV === 'production' && !force) {
    console.error(
      `Refusing to run migrate:fresh against a production environment without --force.\n` +
      `This PERMANENTLY DELETES "${dbPath}" and all data in it.`,
    );
    process.exit(1);
  }

  if (!force) {
    const ok = await confirm(
      `This will permanently delete "${dbPath}" and ALL its data, then re-run every migration. Continue? [y/N] `,
    );
    if (!ok) {
      console.log('Aborted — no changes made.');
      return;
    }
  }

  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const file = absPath + suffix;
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`Deleted ${file}`);
    }
  }

  await dataSource.initialize();
  console.log('Running migrations...');
  const applied = await dataSource.runMigrations();
  for (const m of applied) console.log(`  ✓ ${m.name}`);
  console.log(`Applied ${applied.length} migration(s).`);
  await dataSource.destroy();

  if (seed) {
    await seedViaAppContext();
  }

  console.log('migrate:fresh complete.');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
