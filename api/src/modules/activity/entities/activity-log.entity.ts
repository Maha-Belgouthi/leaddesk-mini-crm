import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ActivityAction } from '../../../common/enums/activity-action.enum.js';
import type { Lead } from '../../leads/entities/lead.entity.js';
import type { User } from '../../users/entities/user.entity.js';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @ManyToOne('Lead', (lead: Lead) => lead.activityLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  // Nullable when performed by automated system/cron jobs (e.g. overdue check)
  @Index()
  @Column({ name: 'performed_by_id', type: 'uuid', nullable: true })
  performedById: string | null;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performed_by_id' })
  performedBy: User | null;

  @Column({
    type: 'enum',
    enum: ActivityAction,
  })
  action: ActivityAction;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, any> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, any> | null;

  @Column({ type: 'text' })
  summary: string;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

