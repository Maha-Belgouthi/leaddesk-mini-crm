import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity.js';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepo: Repository<ActivityLog>,
  ) {}

  async findByLead(leadId: string): Promise<ActivityLog[]> {
    return this.activityRepo.find({
      where: { leadId },
      order: { createdAt: 'DESC' },
      relations: { performedBy: true },
    });
  }

  async log(data: Partial<ActivityLog>): Promise<ActivityLog> {
    const entry = this.activityRepo.create(data);
    return this.activityRepo.save(entry);
  }
}
