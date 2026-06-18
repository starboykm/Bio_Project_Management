import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private readonly notifications: Repository<Notification>) {}

  findForUser(userId: string) {
    return this.notifications.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  create(dto: CreateNotificationDto) {
    return this.notifications.save(this.notifications.create(dto));
  }

  async markRead(id: string, userId: string) {
    const notification = await this.notifications.findOne({ where: { id, userId } });
    if (!notification) {
      return null;
    }
    notification.isRead = true;
    return this.notifications.save(notification);
  }

  async markUnread(id: string, userId: string) {
    const notification = await this.notifications.findOne({ where: { id, userId } });
    if (!notification) {
      return null;
    }
    notification.isRead = false;
    return this.notifications.save(notification);
  }

  async markAllRead(userId: string) {
    await this.notifications.update({ userId, isRead: false }, { isRead: true });
    return { updated: true };
  }
}
