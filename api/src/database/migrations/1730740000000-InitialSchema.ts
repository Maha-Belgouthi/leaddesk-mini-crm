import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730740000000 implements MigrationInterface {
  name = 'InitialSchema1730740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable extensions for UUID generation and Trigram text indexing
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);

    // Create Domain Enums
    await queryRunner.query(
      `CREATE TYPE "user_role_enum" AS ENUM('ADMIN', 'SALES_EXECUTIVE', 'CLIENT');`,
    );
    await queryRunner.query(
      `CREATE TYPE "lead_status_enum" AS ENUM('NEW', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST');`,
    );
    await queryRunner.query(
      `CREATE TYPE "lead_source_enum" AS ENUM('website', 'google_ads', 'facebook', 'referral', 'other');`,
    );
    await queryRunner.query(
      `CREATE TYPE "lead_service_enum" AS ENUM(
        'comprehensive_consultation',
        'full_degree_course',
        'annual_maintenance',
        'regular_treatment',
        'certification_program',
        'repair_service',
        'general_inquiry',
        'basic_checkup'
      );`,
    );
    await queryRunner.query(
      `CREATE TYPE "activity_action_enum" AS ENUM(
        'STATUS_CHANGE',
        'ASSIGNMENT_CHANGE',
        'NOTE_ADDED',
        'SCORE_RECALCULATED',
        'FLAGGED_OVERDUE'
      );`,
    );

    // 1. Clients Table (Organization / Tenant)
    await queryRunner.query(`
      CREATE TABLE "clients" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(150) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "email" varchar(150),
        "phone" varchar(30),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_clients_slug" UNIQUE ("slug")
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_clients_slug" ON "clients" ("slug");`,
    );

    // 2. Users Table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" varchar(150) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "full_name" varchar(120) NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'SALES_EXECUTIVE',
        "client_id" uuid,
        "refresh_token_hash" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_users_email" UNIQUE ("email"),
        CONSTRAINT "fk_users_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email");`,
    );

    // 3. Leads Table
    await queryRunner.query(`
      CREATE TABLE "leads" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "client_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "phone" varchar(30) NOT NULL,
        "email" varchar(150) NOT NULL,
        "service_needed" "lead_service_enum" NOT NULL,
        "budget" integer NOT NULL,
        "message" text NOT NULL,
        "source" "lead_source_enum" NOT NULL DEFAULT 'website',
        "status" "lead_status_enum" NOT NULL DEFAULT 'NEW',
        "score" integer NOT NULL DEFAULT 0,
        "score_breakdown" jsonb,
        "assigned_to_id" uuid,
        "is_overdue" boolean NOT NULL DEFAULT false,
        "first_contacted_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_leads_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_leads_assigned_user" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_leads_client_status" ON "leads" ("client_id", "status");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_leads_assigned_status" ON "leads" ("assigned_to_id", "status");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_leads_status" ON "leads" ("status");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_leads_source" ON "leads" ("source");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_leads_is_overdue" ON "leads" ("is_overdue");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_leads_created_at" ON "leads" ("created_at");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_leads_name_trgm" ON "leads" USING gin ("name" gin_trgm_ops);`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_leads_phone_trgm" ON "leads" USING gin ("phone" gin_trgm_ops);`,
    );

    // 4. Notes Table
    await queryRunner.query(`
      CREATE TABLE "notes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "lead_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "content" text NOT NULL,
        "is_internal" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_notes_lead" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_notes_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_notes_lead_id" ON "notes" ("lead_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notes_author_id" ON "notes" ("author_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notes_created_at" ON "notes" ("created_at");`,
    );

    // 5. Activity Logs Table
    await queryRunner.query(`
      CREATE TABLE "activity_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "lead_id" uuid NOT NULL,
        "performed_by_id" uuid,
        "action" "activity_action_enum" NOT NULL,
        "old_value" jsonb,
        "new_value" jsonb,
        "summary" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_activity_lead" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_activity_user" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_activity_lead_id" ON "activity_logs" ("lead_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_activity_created_at" ON "activity_logs" ("created_at");`,
    );

    // 6. Notifications Table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "recipient_id" uuid NOT NULL,
        "lead_id" uuid,
        "subject" varchar(200) NOT NULL,
        "body" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_notifications_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_notifications_lead" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_recipient_read" ON "notifications" ("recipient_id", "is_read");`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_created_at" ON "notifications" ("created_at");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notes";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leads";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clients";`);

    await queryRunner.query(`DROP TYPE IF EXISTS "activity_action_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lead_service_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lead_source_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lead_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum";`);
  }
}

