import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OVERDUE_QUEUE } from './jobs.constants.js';
import { JobsService } from './jobs.service.js';
import { OverdueProcessor } from './processors/overdue.processor.js';
import { Lead } from '../leads/entities/lead.entity.js';
import { ActivityModule } from '../activity/activity.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: OVERDUE_QUEUE,
    }),
    TypeOrmModule.forFeature([Lead]),
    ActivityModule,
    NotificationsModule,
  ],
  providers: [JobsService, OverdueProcessor],
  exports: [JobsService],
})
export class JobsModule {}

