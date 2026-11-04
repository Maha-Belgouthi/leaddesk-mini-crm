import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
  ) {}

  async findByRecipient(recipientId: string): Promise<Notification[]> {
    return this.notificationsRepo.find({
      where: { recipientId },
      order: { createdAt: 'DESC' },
    });
  }

  async countUnread(recipientId: string): Promise<number> {
    return this.notificationsRepo.count({
      where: { recipientId, isRead: false },
    });
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationsRepo.update(id, { isRead: true });
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    const notification = this.notificationsRepo.create(data);
    return this.notificationsRepo.save(notification);
  }
}
