import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ActivityService } from './activity.service.js';

@ApiTags('Activity')
@Controller('leads/:leadId/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  findByLead(@Param('leadId') leadId: string) {
    return this.activityService.findByLead(leadId);
  }
}
