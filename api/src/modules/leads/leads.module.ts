import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity.js';
import { LeadsService } from './leads.service.js';
import { LeadsController } from './leads.controller.js';
import { ScoringService } from './scoring.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Lead])],
  providers: [LeadsService, ScoringService],
  controllers: [LeadsController],
  exports: [LeadsService, ScoringService],
})
export class LeadsModule {}
