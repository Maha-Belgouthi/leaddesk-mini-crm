import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { OVERDUE_QUEUE } from '../jobs.constants.js';
import { Lead } from '../../leads/entities/lead.entity.js';
import { ActivityService } from '../../activity/activity.service.js';
import { NotificationsService } from '../../notifications/notifications.service.js';
import { LeadStatus } from '../../../common/enums/lead-status.enum.js';
import { ActivityAction } from '../../../common/enums/activity-action.enum.js';

@Processor(OVERDUE_QUEUE)
@Injectable()
export class OverdueProcessor extends WorkerHost {
  private readonly logger = new Logger(OverdueProcessor.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadsRepo: Repository<Lead>,
    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<{ processed: number; flagged: number }> {
    this.logger.log(`Executing background job [${job.name}] with id ${job.id}`);

    const thresholdHours = parseInt(
      this.configService.get<string>('OVERDUE_HOURS_THRESHOLD') ?? '24',
      10,
    );

    const cutoffDate = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    // Query leads remaining in NEW status past the threshold and not yet flagged
    const overdueLeads = await this.leadsRepo.find({
      where: {
        status: LeadStatus.NEW,
        isOverdue: false,
        createdAt: LessThanOrEqual(cutoffDate),
      },
      relations: { assignedTo: true },
    });

    if (overdueLeads.length === 0) {
      this.logger.log('Overdue scan completed: 0 new overdue leads found.');
      return { processed: 0, flagged: 0 };
    }

    this.logger.warn(`Found ${overdueLeads.length} leads overdue for contact (> ${thresholdHours}h). Flagging...`);

    let flaggedCount = 0;

    for (const lead of overdueLeads) {
      lead.isOverdue = true;
      await this.leadsRepo.save(lead);

      // Audit log the automated overdue flagging
      await this.activityService.log({
        leadId: lead.id,
        performedById: null, // System automated job
        action: ActivityAction.FLAGGED_OVERDUE,
        summary: `Lead automatically flagged as overdue (> ${thresholdHours}h uncontacted in NEW status)`,
      });

      // Dispatch notification to the assigned representative if assigned
      if (lead.assignedToId) {
        await this.notificationsService.create({
          recipientId: lead.assignedToId,
          leadId: lead.id,
          subject: '⚠️ Lead Flagged Overdue',
          body: `Lead "${lead.name}" (${lead.serviceNeeded}) has been in NEW status for over ${thresholdHours} hours without initial contact.`,
        });
      }

      flaggedCount++;
    }

    this.logger.log(`Overdue scan finished: ${flaggedCount} leads flagged.`);
    return { processed: overdueLeads.length, flagged: flaggedCount };
  }
}

