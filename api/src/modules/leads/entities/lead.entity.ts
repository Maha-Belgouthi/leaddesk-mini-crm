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
import { LeadStatus } from '../../../common/enums/lead-status.enum.js';
import { LeadSource } from '../../../common/enums/lead-source.enum.js';
import { LeadService } from '../../../common/enums/lead-service.enum.js';
import type { Client } from '../../clients/entities/client.entity.js';
import type { User } from '../../users/entities/user.entity.js';
import type { Note } from '../../notes/entities/note.entity.js';
import type { ActivityLog } from '../../activity/entities/activity-log.entity.js';
import type { Notification } from '../../notifications/entities/notification.entity.js';

@Entity('leads')
@Index(['clientId', 'status'])
@Index(['assignedToId', 'status'])
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @ManyToOne('Client', (client: Client) => client.leads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Index()
  @Column({ length: 120 })
  name: string;

  @Index()
  @Column({ length: 30 })
  phone: string;

  @Index()
  @Column({ length: 150 })
  email: string;

  @Column({
    name: 'service_needed',
    type: 'enum',
    enum: LeadService,
  })
  serviceNeeded: LeadService;

  // Stored as integer representing whole Indian Rupees (₹)
  @Column({ type: 'integer' })
  budget: number;

  @Column({ type: 'text' })
  message: string;

  @Index()
  @Column({
    type: 'enum',
    enum: LeadSource,
    default: LeadSource.WEBSITE,
  })
  source: LeadSource;

  @Index()
  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW,
  })
  status: LeadStatus;

  // Lead score (0 - 100), rule-based
  @Column({ type: 'integer', default: 0 })
  score: number;

  @Column({ name: 'score_breakdown', type: 'jsonb', nullable: true })
  scoreBreakdown: Record<string, any> | null;

  @Index()
  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId: string | null;

  @ManyToOne('User', (user: User) => user.assignedLeads, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User | null;

  // Flagged by 24h background job when in NEW status
  @Index()
  @Column({ name: 'is_overdue', default: false })
  isOverdue: boolean;

  @Column({ name: 'first_contacted_at', type: 'timestamp', nullable: true })
  firstContactedAt: Date | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('Note', (note: Note) => note.lead)
  notes: Note[];

  @OneToMany('ActivityLog', (activity: ActivityLog) => activity.lead)
  activityLogs: ActivityLog[];

  @OneToMany('Notification', (notification: Notification) => notification.lead)
  notifications: Notification[];
}

