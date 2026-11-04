import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { User } from '../../users/entities/user.entity.js';
import type { Lead } from '../../leads/entities/lead.entity.js';

@Entity('notifications')
@Index(['recipientId', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @ManyToOne('User', (user: User) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Index()
  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId: string | null;

  @ManyToOne('Lead', (lead: Lead) => lead.notifications, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead | null;

  @Column({ length: 200 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Index()
  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

