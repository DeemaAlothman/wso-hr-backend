import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Create Notification
  // ==========================================
  async create(data: {
    recipientId: number;
    title: string;
    message: string;
    type?: NotificationType;
    data?: any;
  }) {
    return this.prisma.notification.create({
      data: {
        recipientId: data.recipientId,
        title: data.title,
        message: data.message,
        type: data.type || 'system',
        data: data.data,
      },
    });
  }

  // ==========================================
  // Get User Notifications
  // ==========================================
  async findByUser(userId: number, page = 1, limit = 20, isRead?: boolean) {
    const skip = (page - 1) * limit;
    const where: any = { recipientId: userId };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // Get Unread Count
  // ==========================================
  async getUnreadCount(userId: number) {
    const count = await this.prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });

    return { count };
  }

  // ==========================================
  // Mark as Read
  // ==========================================
  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientId: userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // ==========================================
  // Mark All as Read
  // ==========================================
  async markAllAsRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true, message: 'All notifications marked as read' };
  }

  // ==========================================
  // Delete Notification
  // ==========================================
  async delete(id: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientId: userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id } });

    return { success: true, message: 'Notification deleted' };
  }
}
