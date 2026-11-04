import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity.js';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly notesRepo: Repository<Note>,
  ) {}

  async findByLead(leadId: string, includeInternal = false): Promise<Note[]> {
    const where: any = { leadId };
    if (!includeInternal) {
      where.isInternal = false;
    }
    return this.notesRepo.find({ where, order: { createdAt: 'DESC' }, relations: { author: true } });
  }

  async create(data: Partial<Note>): Promise<Note> {
    const note = this.notesRepo.create(data);
    return this.notesRepo.save(note);
  }
}
