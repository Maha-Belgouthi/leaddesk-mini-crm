import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity.js';
import { ActivityService } from '../activity/activity.service.js';
import { ActivityAction } from '../../common/enums/activity-action.enum.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { CreateNoteDto } from './dto/create-note.dto.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly notesRepo: Repository<Note>,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Retrieves notes for a lead with role privacy filter.
   * Internal notes are strictly excluded for CLIENT users.
   */
  async findByLeadScoped(leadId: string, user: AuthenticatedUser): Promise<Note[]> {
    const isClient = user.role === UserRole.CLIENT;
    const where: any = { leadId };

    if (isClient) {
      where.isInternal = false;
    }

    return this.notesRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: { author: true },
    });
  }

  /**
   * Appends note to lead and logs activity audit entry while protecting internal note privacy.
   */
  async createScoped(
    leadId: string,
    dto: CreateNoteDto,
    user: AuthenticatedUser,
  ): Promise<Note> {
    const isInternal = user.role === UserRole.CLIENT ? false : (dto.isInternal ?? false);

    const note = this.notesRepo.create({
      leadId,
      authorId: user.id,
      content: dto.content,
      isInternal,
    });

    const savedNote = await this.notesRepo.save(note);

    // Privacy constraint: internal notes do not expose raw text in activity summary
    const summary = isInternal
      ? 'Internal note added'
      : `Note added: "${dto.content.slice(0, 50)}${dto.content.length > 50 ? '...' : ''}"`;

    await this.activityService.log({
      leadId,
      performedById: user.id,
      action: ActivityAction.NOTE_ADDED,
      summary,
    });

    return savedNote;
  }

  async findByLead(leadId: string, includeInternal = false): Promise<Note[]> {
    const where: any = { leadId };
    if (!includeInternal) {
      where.isInternal = false;
    }
    return this.notesRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: { author: true },
    });
  }

  async create(data: Partial<Note>): Promise<Note> {
    const note = this.notesRepo.create(data);
    return this.notesRepo.save(note);
  }
}
