import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { InitialSchema1730740000000 } from '../database/migrations/1730740000000-InitialSchema.js';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'postgres',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres_dev_password',
    database: process.env.DB_NAME ?? 'leaddesk_db',
    autoLoadEntities: true,
    // Obligatory constraint: synchronize is strictly FALSE in all environments
    synchronize: false,
    // Automatically execute pending migrations on API start (Rule 8)
    migrationsRun: true,
    migrations: [InitialSchema1730740000000],
    logging: process.env.NODE_ENV === 'development',
  }),
);
