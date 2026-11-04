import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Lead } from '../../leads/entities/lead.entity.js';
import type { User } from '../../users/entities/user.entity.js';

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @ManyToOne('Lead', (lead: Lead) => lead.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Index()
  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @ManyToOne('User', (user: User) => user.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'text' })
  content: string;

  // Internal notes are hidden from CLIENT users for privacy
  @Column({ name: 'is_internal', default: false })
  isInternal: boolean;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

