import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { User } from '../../users/entities/user.entity.js';
import type { Lead } from '../../leads/entities/lead.entity.js';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ length: 150, nullable: true })
  email: string;

  @Column({ length: 30, nullable: true })
  phone: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany('User', (user: User) => user.client)
  users: User[];

  @OneToMany('Lead', (lead: Lead) => lead.client)
  leads: Lead[];
}

