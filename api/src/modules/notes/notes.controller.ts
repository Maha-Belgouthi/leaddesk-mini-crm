import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotesService } from './notes.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Notes')
@ApiBearerAuth()
@Controller('leads/:leadId/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({
    summary: 'List notes for a lead (internal notes automatically omitted for clients)',
  })
  findByLead(
    @Param('leadId') leadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notesService.findByLeadScoped(leadId, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add note to a lead with optional internal visibility flag',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Note successfully added',
  })
  create(
    @Param('leadId') leadId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notesService.createScoped(leadId, dto, user);
  }
}
