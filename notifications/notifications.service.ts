import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscribeDto } from './dto/subscribe.dto';
import { Notification, NotificationType } from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(PushSubscription)
    private pushSubscriptionRepository: Repository<PushSubscription>,
  ) {}

  async findAll(userId: string) {
    const notifications = await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return notifications;
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Ensure it belongs to user
    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this notification');
    }

    notification.isRead = true;
    return await this.notificationRepository.save(notification);
  }

  async subscribe(userId: string, dto: SubscribeDto) {
    // Check if subscription already exists for this endpoint
    const existingSubscription = await this.pushSubscriptionRepository.findOne({
      where: {
        userId,
        endpoint: dto.endpoint,
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.keys = dto.keys;
      existingSubscription.expirationTime = dto.expirationTime
        ? new Date(dto.expirationTime)
        : null;
      return await this.pushSubscriptionRepository.save(existingSubscription);
    }

    // Create new subscription
    const subscription = this.pushSubscriptionRepository.create({
      endpoint: dto.endpoint,
      keys: dto.keys,
      expirationTime: dto.expirationTime ? new Date(dto.expirationTime) : null,
      user: { id: userId } as User,
    });

    return await this.pushSubscriptionRepository.save(subscription);
  }

  async createNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationType = NotificationType.INFO,
  ) {
    const notification = this.notificationRepository.create({
      title,
      body,
      type,
      isRead: false,
      user: { id: userId } as User,
    });

    return await this.notificationRepository.save(notification);
  }
}
