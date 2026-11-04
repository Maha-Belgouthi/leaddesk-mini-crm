import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LeadsService } from './leads.service.js';
import {
  CreatePublicLeadDto,
  UpdateLeadStatusDto,
  AssignLeadDto,
} from './dto/index.js';
import { Public, CurrentUser, Roles } from '../../common/decorators/index.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('public/:clientSlug')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit inquiry through public website/landing page (Rate limited 5/min, honeypot protected)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Inquiry registered and auto-assigned',
  })
  createPublicLead(
    @Param('clientSlug') clientSlug: string,
    @Body() dto: CreatePublicLeadDto,
  ) {
    return this.leadsService.createPublicLead(clientSlug, dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List leads with role-based visibility filter' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('clientId') clientId?: string,
  ) {
    return this.leadsService.findAll(user, clientId);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Retrieve lead details (enforces 404 on unassigned sales reps)',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.leadsService.findOneScoped(id, user);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Advance lead pipeline status with validation and automatic score recalculation',
  })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.updateStatus(id, dto.status, user);
  }

  @Patch(':id/assign')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.SALES_EXECUTIVE)
  @ApiOperation({ summary: 'Reassign lead to a sales executive' })
  assignLead(
    @Param('id') id: string,
    @Body() dto: AssignLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadsService.assignLead(id, dto.assignedToId, user);
  }
}
