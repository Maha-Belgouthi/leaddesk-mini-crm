import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Client } from '../modules/clients/entities/client.entity.js';
import { User } from '../modules/users/entities/user.entity.js';
import { Lead } from '../modules/leads/entities/lead.entity.js';
import { Note } from '../modules/notes/entities/note.entity.js';
import { ActivityLog } from '../modules/activity/entities/activity-log.entity.js';
import { Notification } from '../modules/notifications/entities/notification.entity.js';

// Load environment variables for TypeORM CLI operations
dotenv.config({ path: ['../.env', '.env'] });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres_dev_password',
  database: process.env.DB_NAME ?? 'leaddesk_db',
  // Obligatory constraint: synchronize is strictly FALSE
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [Client, User, Lead, Note, ActivityLog, Notification],
  migrations: [
    process.env.NODE_ENV === 'production'
      ? 'dist/database/migrations/*.js'
      : 'src/database/migrations/*.ts',
  ],
});

export default AppDataSource;

