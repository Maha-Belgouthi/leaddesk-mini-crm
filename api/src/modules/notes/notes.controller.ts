import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotesService } from './notes.service.js';

@ApiTags('Notes')
@Controller('leads/:leadId/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  findByLead(
    @Param('leadId') leadId: string,
    @Query('includeInternal') includeInternal?: string,
  ) {
    return this.notesService.findByLead(leadId, includeInternal === 'true');
  }
}
