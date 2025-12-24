import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityAction } from '@prisma/client';

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Create Activity Log
  // ==========================================
  async create(data: {
    userId?: number;
    action: ActivityAction;
    entityType?: string;
    entityId?: string;
    description?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        description: data.description,
        changes: data.changes,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  // ==========================================
  // Get All Activity Logs (with pagination)
  // ==========================================
  async findAll(params: {
    page?: number;
    limit?: number;
    userId?: number;
    action?: ActivityAction;
    entityType?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.action) {
      where.action = params.action;
    }

    if (params.entityType) {
      where.entityType = params.entityType;
    }

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              userLogin: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.activityLog.count({ where }),
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
  // Get Activity Logs by User ID
  // ==========================================
  async findByUser(userId: number, page = 1, limit = 20) {
    return this.findAll({ userId, page, limit });
  }

  // ==========================================
  // Get Activity Logs by Entity
  // ==========================================
  async findByEntity(
    entityType: string,
    entityId: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: {
          entityType,
          entityId,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              userLogin: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.activityLog.count({
        where: {
          entityType,
          entityId,
        },
      }),
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
}
