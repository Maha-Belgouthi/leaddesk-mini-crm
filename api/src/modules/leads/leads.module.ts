import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity.js';
import { LeadsService } from './leads.service.js';
import { LeadsController } from './leads.controller.js';
import { ScoringService } from './scoring.service.js';
import { ClientsModule } from '../clients/clients.module.js';
import { UsersModule } from '../users/users.module.js';
import { ActivityModule } from '../activity/activity.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead]),
    ClientsModule,
    UsersModule,
    ActivityModule,
    NotificationsModule,
  ],
  providers: [LeadsService, ScoringService],
  controllers: [LeadsController],
  exports: [LeadsService, ScoringService],
})
export class LeadsModule {}
