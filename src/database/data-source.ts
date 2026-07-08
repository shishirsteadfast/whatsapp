import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

// Single SQLite database — used by the TypeORM CLI (migration:generate/run/revert)
export default new DataSource({
  type: 'sqlite',
  database: process.env.DATABASE_NAME || './data/jeishanulwa.sqlite',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === 'true',
});