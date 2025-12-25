import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { ApproveRejectDto } from './dto/approve-reject.dto';
import { LeaveRequestStatus } from '@prisma/client';
import { LeaveBalanceService } from '../leave-balance/leave-balance.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveBalance: LeaveBalanceService,
    private readonly notifications: NotificationsService,
  ) {}

  // ==========================================
  // Generate Request Number
  // ==========================================
  private async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.hrLeaveRequest.count({
      where: {
        requestNumber: {
          startsWith: `LR${year}`,
        },
      },
    });
    return `LR${year}${String(count + 1).padStart(5, '0')}`;
  }

  // ==========================================
  // Calculate Days Between Dates
  // ==========================================
  private calculateDays(
    startDate: Date,
    endDate: Date,
    isHalfDay: boolean = false,
  ): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate difference in days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return isHalfDay ? 0.5 : diffDays;
  }

  // ==========================================
  // Get All Leave Requests (with filters)
  // ==========================================
  async findAll(
    userId?: number,
    status?: LeaveRequestStatus,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.hrLeaveRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              userLogin: true,
              displayName: true,
              email: true,
            },
          },
          leaveType: {
            select: {
              id: true,
              leaveTypeName: true,
              leaveTypeCode: true,
            },
          },
          manager: {
            select: {
              id: true,
              displayName: true,
            },
          },
          hrOfficer: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.hrLeaveRequest.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  // ==========================================
  // Get Leave Request by ID
  // ==========================================
  async findOne(id: number) {
    const request = await this.prisma.hrLeaveRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            userLogin: true,
            displayName: true,
            email: true,
            departmentId: true,
          },
        },
        leaveType: {
          select: {
            id: true,
            leaveTypeName: true,
            leaveTypeCode: true,
            requiresApproval: true,
            requiresAttachment: true,
          },
        },
        manager: {
          select: {
            id: true,
            displayName: true,
          },
        },
        hrOfficer: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Leave request #${id} not found`);
    }

    return request;
  }

  // ==========================================
  // Get My Leave Requests
  // ==========================================
  async getMyRequests(userId: number, status?: LeaveRequestStatus, page = 1, limit = 20) {
    return this.findAll(userId, status, page, limit);
  }

  // ==========================================
  // Get Pending Requests for Manager
  // ==========================================
  async getPendingForManager(managerId: number) {
    // Get users under this manager
    const department = await this.prisma.department.findFirst({
      where: { managerId },
      include: {
        users: {
          select: { id: true },
        },
      },
    });

    if (!department) {
      return [];
    }

    const userIds = department.users.map((u) => u.id);

    return this.prisma.hrLeaveRequest.findMany({
      where: {
        userId: { in: userIds },
        status: LeaveRequestStatus.pending_manager,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        leaveType: {
          select: {
            id: true,
            leaveTypeName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ==========================================
  // Get Pending Requests for HR
  // ==========================================
  async getPendingForHR() {
    return this.prisma.hrLeaveRequest.findMany({
      where: {
        status: LeaveRequestStatus.pending_hr,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        leaveType: {
          select: {
            id: true,
            leaveTypeName: true,
          },
        },
        manager: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ==========================================
  // Create Leave Request
  // ==========================================
  async create(userId: number, dto: CreateLeaveRequestDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Validate dates
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Calculate days
    const totalDays = this.calculateDays(startDate, endDate, dto.isHalfDay);

    // Get leave type
    const leaveType = await this.prisma.hrLeaveType.findUnique({
      where: { id: dto.leaveTypeId },
    });

    if (!leaveType || !leaveType.isActive) {
      throw new BadRequestException('Invalid or inactive leave type');
    }

    // Check if attachment is required
    if (leaveType.requiresAttachment && !dto.attachmentPath) {
      throw new BadRequestException(
        `Attachment is required for ${leaveType.leaveTypeName}`,
      );
    }

    // Check balance
    const hasBalance = await this.leaveBalance.checkBalance(
      userId,
      dto.leaveTypeId,
      totalDays,
    );

    if (!hasBalance) {
      // Get actual balance for better error message
      const currentYear = new Date().getFullYear();
      const balance = await this.prisma.hrLeaveBalance.findFirst({
        where: {
          userId,
          leaveTypeId: dto.leaveTypeId,
          year: currentYear,
        },
      });

      if (!balance) {
        throw new BadRequestException(
          `No leave balance found for this leave type in ${currentYear}. Please contact HR to initialize your balance.`,
        );
      }

      throw new BadRequestException(
        `Insufficient leave balance. Available: ${balance.remainingBalance} days, Requested: ${totalDays} days`,
      );
    }

    // Get user's manager
    const user = await this.prisma.wsoSysUser.findUnique({
      where: { id: userId },
      include: {
        department: {
          select: {
            managerId: true,
          },
        },
      },
    });

    // Determine initial status
    const initialStatus = leaveType.requiresApproval
      ? LeaveRequestStatus.pending_manager
      : LeaveRequestStatus.approved_hr;

    // Generate request number
    const requestNumber = await this.generateRequestNumber();

    // Create request
    const request = await this.prisma.hrLeaveRequest.create({
      data: {
        requestNumber,
        userId,
        leaveTypeId: dto.leaveTypeId,
        startDate,
        endDate,
        totalDays,
        isHalfDay: dto.isHalfDay || false,
        halfDayPeriod: dto.halfDayPeriod,
        reason: dto.reason,
        attachments: dto.attachmentPath ? { path: dto.attachmentPath } : undefined,
        status: initialStatus,
        managerId: user?.department?.managerId,
      },
      include: {
        leaveType: true,
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    // If requires approval, notify manager
    if (leaveType.requiresApproval && user?.department?.managerId) {
      const userName = user.displayName || user.userLogin;
      await this.notifications.create({
        recipientId: user.department.managerId,
        title: 'New Leave Request',
        message: `${userName} has submitted a ${leaveType.leaveTypeName} request for ${totalDays} day(s)`,
        type: 'leave',
        data: { leaveRequestId: request.id },
      });
    }

    return request;
  }

  // ==========================================
  // Update Leave Request (only if pending)
  // ==========================================
  async update(id: number, userId: number, dto: UpdateLeaveRequestDto) {
    const request = await this.findOne(id);

    // Only owner can update
    if (request.userId !== userId) {
      throw new ForbiddenException('You can only update your own requests');
    }

    // Only pending requests can be updated
    if (request.status !== LeaveRequestStatus.pending_manager) {
      throw new BadRequestException('Only pending requests can be updated');
    }

    // Recalculate days if dates changed
    let totalDays = request.totalDays;
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate ? new Date(dto.startDate) : request.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : request.endDate;
      const isHalfDay = dto.isHalfDay !== undefined ? dto.isHalfDay : request.isHalfDay;
      totalDays = this.calculateDays(startDate, endDate, isHalfDay);
    }

    return this.prisma.hrLeaveRequest.update({
      where: { id },
      data: {
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        totalDays,
        isHalfDay: dto.isHalfDay,
        halfDayPeriod: dto.halfDayPeriod,
        reason: dto.reason,
        attachments: dto.attachmentPath ? { path: dto.attachmentPath } : undefined,
      },
      include: {
        leaveType: true,
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  // ==========================================
  // Manager Approve
  // ==========================================
  async managerApprove(id: number, managerId: number, dto: ApproveRejectDto) {
    const request = await this.findOne(id);

    if (request.status !== LeaveRequestStatus.pending_manager) {
      throw new BadRequestException('Request is not pending manager approval');
    }

    // Verify manager has authority
    const department = await this.prisma.department.findFirst({
      where: {
        managerId,
        users: {
          some: {
            id: request.userId,
          },
        },
      },
    });

    if (!department) {
      throw new ForbiddenException('You are not the manager of this employee');
    }

    // Update request
    const updated = await this.prisma.hrLeaveRequest.update({
      where: { id },
      data: {
        status: LeaveRequestStatus.approved_manager,
        managerId,
        managerApprovalDate: new Date(),
        managerNotes: dto.comments,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
        leaveType: true,
      },
    });

    // Change status to pending_hr
    await this.prisma.hrLeaveRequest.update({
      where: { id },
      data: {
        status: LeaveRequestStatus.pending_hr,
      },
    });

    // Notify user
    await this.notifications.create({
      recipientId: request.userId,
      title: 'Leave Request - Manager Approved',
      message: `Your ${request.leaveType.leaveTypeName} request has been approved by your manager and is now pending HR review`,
      type: 'leave',
      data: { leaveRequestId: id },
    });

    // Notify HR
    const hrUsers = await this.prisma.wsoSysUser.findMany({
      where: {
        roles: {
          some: {
            role: {
              code: {
                in: ['hr_admin', 'system_admin'],
              },
            },
          },
        },
        isActive: true,
      },
    });

    for (const hrUser of hrUsers) {
      await this.notifications.create({
        recipientId: hrUser.id,
        title: 'Leave Request - Pending HR Approval',
        message: `${updated.user.displayName}'s ${updated.leaveType.leaveTypeName} request is pending HR approval`,
        type: 'leave',
        data: { leaveRequestId: id },
      });
    }

    return updated;
  }

  // ==========================================
  // Manager Reject
  // ==========================================
  async managerReject(id: number, managerId: number, dto: ApproveRejectDto) {
    const request = await this.findOne(id);

    if (request.status !== LeaveRequestStatus.pending_manager) {
      throw new BadRequestException('Request is not pending manager approval');
    }

    // Verify manager has authority
    const department = await this.prisma.department.findFirst({
      where: {
        managerId,
        users: {
          some: {
            id: request.userId,
          },
        },
      },
    });

    if (!department) {
      throw new ForbiddenException('You are not the manager of this employee');
    }

    // Update request
    const updated = await this.prisma.hrLeaveRequest.update({
      where: { id },
      data: {
        status: LeaveRequestStatus.rejected_manager,
        managerId,
        managerApprovalDate: new Date(),
        managerNotes: dto.comments,
      },
      include: {
        leaveType: true,
      },
    });

    // Notify user
    await this.notifications.create({
      recipientId: request.userId,
      title: 'Leave Request - Rejected by Manager',
      message: `Your ${updated.leaveType.leaveTypeName} request has been rejected by your manager${dto.comments ? ': ' + dto.comments : ''}`,
      type: 'leave',
      data: { leaveRequestId: id },
    });

    return updated;
  }

  // ==========================================
  // HR Approve (Final Approval)
  // ==========================================
  async hrApprove(id: number, hrUserId: number, dto: ApproveRejectDto) {
    const request = await this.findOne(id);

    if (request.status !== LeaveRequestStatus.pending_hr && request.status !== LeaveRequestStatus.approved_manager) {
      throw new BadRequestException('Request is not pending HR approval');
    }

    // Deduct from balance
    await this.leaveBalance.deductBalance(
      request.userId,
      request.leaveTypeId,
      request.totalDays,
    );

    // Update request
    const updated = await this.prisma.hrLeaveRequest.update({
      where: { id },
      data: {
        status: LeaveRequestStatus.approved_hr,
        hrOfficerId: hrUserId,
        hrApprovalDate: new Date(),
        hrNotes: dto.comments,
      },
      include: {
        leaveType: true,
      },
    });

    // Notify user
    await this.notifications.create({
      recipientId: request.userId,
      title: 'Leave Request - Approved',
      message: `Your ${updated.leaveType.leaveTypeName} request has been approved by HR. ${request.totalDays} day(s) have been deducted from your balance.`,
      type: 'leave',
      data: { leaveRequestId: id },
    });

    return updated;
  }

  // ==========================================
  // HR Reject
  // ==========================================
  async hrReject(id: number, hrUserId: number, dto: ApproveRejectDto) {
    const request = await this.findOne(id);

    if (request.status !== LeaveRequestStatus.pending_hr && request.status !== LeaveRequestStatus.approved_manager) {
      throw new BadRequestException('Request is not pending HR approval');
    }

    // Update request
    const updated = await this.prisma.hrLeaveRequest.update({
      where: { id },
      data: {
        status: LeaveRequestStatus.rejected_hr,
        hrOfficerId: hrUserId,
        hrApprovalDate: new Date(),
        hrNotes: dto.comments,
      },
      include: {
        leaveType: true,
      },
    });

    // Notify user
    await this.notifications.create({
      recipientId: request.userId,
      title: 'Leave Request - Rejected by HR',
      message: `Your ${updated.leaveType.leaveTypeName} request has been rejected by HR${dto.comments ? ': ' + dto.comments : ''}`,
      type: 'leave',
      data: { leaveRequestId: id },
    });

    return updated;
  }

  // ==========================================
  // Cancel Request
  // ==========================================
  async cancel(id: number, userId: number, reason: string) {
    const request = await this.findOne(id);

    // Only owner can cancel
    if (request.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    // Can only cancel if not already approved by HR
    if (request.status === LeaveRequestStatus.approved_hr) {
      throw new BadRequestException(
        'Cannot cancel approved requests. Please contact HR.',
      );
    }

    // If already rejected or cancelled, cannot cancel again
    if (
      request.status === LeaveRequestStatus.cancelled ||
      request.status === LeaveRequestStatus.rejected_manager ||
      request.status === LeaveRequestStatus.rejected_hr
    ) {
      throw new BadRequestException('Request is already closed');
    }

    return this.prisma.hrLeaveRequest.update({
      where: { id },
      data: {
        status: LeaveRequestStatus.cancelled,
        hrNotes: `Cancelled by user. Reason: ${reason}`,
      },
    });
  }

  // ==========================================
  // Delete Leave Request
  // ==========================================
  async remove(id: number) {
    const request = await this.findOne(id);

    // Cannot delete approved requests
    if (request.status === LeaveRequestStatus.approved_hr) {
      throw new BadRequestException('Cannot delete approved requests');
    }

    return this.prisma.hrLeaveRequest.delete({
      where: { id },
    });
  }
}
