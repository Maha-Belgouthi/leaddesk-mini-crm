import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  OVERDUE_QUEUE,
  CHECK_OVERDUE_JOB,
  OVERDUE_REPEATABLE_JOB_ID,
} from './jobs.constants.js';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(OVERDUE_QUEUE)
    private readonly overdueQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.registerRepeatableOverdueJob();
  }

  /**
   * Registers idempotent hourly background job scheduler with fixed scheduler ID.
   * Safe across container restarts without duplicating schedules.
   */
  async registerRepeatableOverdueJob(): Promise<void> {
    try {
      await this.overdueQueue.upsertJobScheduler(
        OVERDUE_REPEATABLE_JOB_ID,
        {
          every: 60 * 60 * 1000, // Runs every 1 hour (3,600,000 ms)
        },
        {
          name: CHECK_OVERDUE_JOB,
          data: {},
          opts: {
            removeOnComplete: 100,
            removeOnFail: 50,
          },
        },
      );
      this.logger.log('Registered repeatable overdue check scheduler (interval: 1 hour).');
    } catch (error) {
      this.logger.warn(`Could not register repeatable overdue job: ${(error as Error).message}`);
    }
  }

  /**
   * Triggers an immediate overdue check (useful for manual trigger and integration tests)
   */
  async triggerOverdueCheck(): Promise<string> {
    const job = await this.overdueQueue.add(
      `${CHECK_OVERDUE_JOB}-manual-${Date.now()}`,
      {},
      {
        removeOnComplete: 10,
        removeOnFail: 10,
      },
    );
    return job.id ?? 'unknown';
  }
}
