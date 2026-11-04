import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity.js';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientsRepo: Repository<Client>,
  ) {}

  async findAll(): Promise<Client[]> {
    return this.clientsRepo.find();
  }

  async findOne(id: string): Promise<Client | null> {
    return this.clientsRepo.findOneBy({ id });
  }

  async findBySlug(slug: string): Promise<Client | null> {
    return this.clientsRepo.findOneBy({ slug });
  }
}
