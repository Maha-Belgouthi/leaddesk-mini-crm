import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService } from './activity.service.js';

@ApiTags('Activity')
@ApiBearerAuth()
@Controller('leads/:leadId/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve chronological activity audit log for a lead' })
  findByLead(@Param('leadId') leadId: string) {
    return this.activityService.findByLead(leadId);
  }
}
