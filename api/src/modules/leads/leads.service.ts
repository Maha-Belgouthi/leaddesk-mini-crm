import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity.js';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadsRepo: Repository<Lead>,
  ) {}

  async findAll(clientId?: string): Promise<Lead[]> {
    if (clientId) {
      return this.leadsRepo.find({ where: { clientId }, order: { createdAt: 'DESC' } });
    }
    return this.leadsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Lead | null> {
    return this.leadsRepo.findOneBy({ id });
  }

  async create(data: Partial<Lead>): Promise<Lead> {
    const lead = this.leadsRepo.create(data);
    return this.leadsRepo.save(lead);
  }

  async update(id: string, data: Partial<Lead>): Promise<Lead | null> {
    await this.leadsRepo.update(id, data);
    return this.findOne(id);
  }
}
