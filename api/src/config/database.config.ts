import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

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
    logging: process.env.NODE_ENV === 'development',
  }),
);

