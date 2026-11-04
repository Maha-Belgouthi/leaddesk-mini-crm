import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum.js';
import type { Client } from '../../clients/entities/client.entity.js';
import type { Lead } from '../../leads/entities/lead.entity.js';
import type { Note } from '../../notes/entities/note.entity.js';
import type { Notification } from '../../notifications/entities/notification.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  // Stored with select: false so password hashes are never exposed in standard queries
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.SALES_EXECUTIVE,
  })
  role: UserRole;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  clientId: string | null;

  @ManyToOne('Client', (client: Client) => client.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  // SHA-256 hashed refresh token with select: false for rotation and revocation
  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  refreshTokenHash: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('Lead', (lead: Lead) => lead.assignedTo)
  assignedLeads: Lead[];

  @OneToMany('Note', (note: Note) => note.author)
  notes: Note[];

  @OneToMany('Notification', (notification: Notification) => notification.recipient)
  notifications: Notification[];
}
