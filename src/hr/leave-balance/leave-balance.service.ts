import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeaveBalanceDto } from './dto/create-leave-balance.dto';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';

@Injectable()
export class LeaveBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Get All Leave Balances (with filters)
  // ==========================================
  async findAll(userId?: number, leaveTypeId?: number, year?: number) {
    const where: any = {};

    if (userId) where.userId = userId;
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (year) where.year = year;

    return this.prisma.hrLeaveBalance.findMany({
      where,
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
      },
      orderBy: [{ userId: 'asc' }, { leaveTypeId: 'asc' }],
    });
  }

  // ==========================================
  // Get Balance by ID
  // ==========================================
  async findOne(id: number) {
    const balance = await this.prisma.hrLeaveBalance.findUnique({
      where: { id },
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
            annualEntitlement: true,
          },
        },
      },
    });

    if (!balance) {
      throw new NotFoundException(`Leave balance #${id} not found`);
    }

    return balance;
  }

  // ==========================================
  // Get User's All Balances (for current year)
  // ==========================================
  async getUserBalances(userId: number, year?: number) {
    const currentYear = year || new Date().getFullYear();

    const balances = await this.prisma.hrLeaveBalance.findMany({
      where: {
        userId,
        year: currentYear,
      },
      include: {
        leaveType: {
          select: {
            id: true,
            leaveTypeName: true,
            leaveTypeCode: true,
            annualEntitlement: true,
            isPaid: true,
            isCarryoverAllowed: true,
          },
        },
      },
      orderBy: { leaveTypeId: 'asc' },
    });

    // Calculate available balance for each
    return balances.map((balance) => ({
      ...balance,
      available: balance.remainingBalance,
    }));
  }

  // ==========================================
  // Create Leave Balance
  // ==========================================
  async create(dto: CreateLeaveBalanceDto) {
    const currentYear = new Date().getFullYear();

    // Check if balance already exists
    const existing = await this.prisma.hrLeaveBalance.findFirst({
      where: {
        userId: dto.userId,
        leaveTypeId: dto.leaveTypeId,
        year: currentYear,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Leave balance already exists for this user and leave type in year ${currentYear}`,
      );
    }

    const usedBalance = dto.used || 0;
    const carriedOver = dto.carryoverFromPreviousYear || 0;
    const totalEntitlement = dto.totalEntitlement + carriedOver;
    const remainingBalance = totalEntitlement - usedBalance;

    return this.prisma.hrLeaveBalance.create({
      data: {
        userId: dto.userId,
        leaveTypeId: dto.leaveTypeId,
        year: currentYear,
        totalEntitlement,
        usedBalance,
        carriedOver,
        remainingBalance,
      },
      include: {
        user: { select: { id: true, displayName: true } },
        leaveType: { select: { id: true, leaveTypeName: true } },
      },
    });
  }

  // ==========================================
  // Initialize Balances for New User
  // ==========================================
  async initializeUserBalances(userId: number) {
    const currentYear = new Date().getFullYear();

    // Get all active leave types
    const leaveTypes = await this.prisma.hrLeaveType.findMany({
      where: { isActive: true },
    });

    const balances: any[] = [];

    for (const leaveType of leaveTypes) {
      // Check if balance already exists
      const existing = await this.prisma.hrLeaveBalance.findFirst({
        where: {
          userId,
          leaveTypeId: leaveType.id,
          year: currentYear,
        },
      });

      if (!existing) {
        const balance = await this.prisma.hrLeaveBalance.create({
          data: {
            userId,
            leaveTypeId: leaveType.id,
            year: currentYear,
            totalEntitlement: leaveType.annualEntitlement,
            usedBalance: 0,
            carriedOver: 0,
            remainingBalance: leaveType.annualEntitlement,
          },
        });
        balances.push(balance);
      }
    }

    return {
      success: true,
      message: `Initialized ${balances.length} leave balance(s) for user`,
      balances,
    };
  }

  // ==========================================
  // Update Leave Balance
  // ==========================================
  async update(id: number, dto: UpdateLeaveBalanceDto) {
    await this.findOne(id);

    return this.prisma.hrLeaveBalance.update({
      where: { id },
      data: dto,
      include: {
        user: { select: { id: true, displayName: true } },
        leaveType: { select: { id: true, leaveTypeName: true } },
      },
    });
  }

  // ==========================================
  // Adjust Balance (Manual Adjustment)
  // ==========================================
  async adjustBalance(id: number, dto: AdjustBalanceDto, adjustedBy: number) {
    const balance = await this.findOne(id);

    const newTotal = balance.totalEntitlement + dto.adjustmentDays;

    if (newTotal < 0) {
      throw new BadRequestException(
        'Adjustment would result in negative total entitlement',
      );
    }

    // Update balance
    const updated = await this.prisma.hrLeaveBalance.update({
      where: { id },
      data: {
        totalEntitlement: newTotal,
      },
      include: {
        user: { select: { id: true, displayName: true } },
        leaveType: { select: { id: true, leaveTypeName: true } },
      },
    });

    // Log the adjustment in balance history
    await this.prisma.hrLeaveBalanceHistory.create({
      data: {
        balanceId: id,
        changedById: adjustedBy,
        changeReason: dto.reason,
        delta: dto.adjustmentDays,
        before: balance.totalEntitlement,
        after: newTotal,
        meta: dto.notes ? { notes: dto.notes } : undefined,
      },
    });

    return updated;
  }

  // ==========================================
  // Deduct Balance (when leave is approved)
  // ==========================================
  async deductBalance(userId: number, leaveTypeId: number, days: number) {
    const currentYear = new Date().getFullYear();

    const balance = await this.prisma.hrLeaveBalance.findFirst({
      where: {
        userId,
        leaveTypeId,
        year: currentYear,
      },
    });

    if (!balance) {
      throw new NotFoundException('Leave balance not found');
    }

    if (balance.remainingBalance < days) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${balance.remainingBalance} days, Requested: ${days} days`,
      );
    }

    const newUsed = balance.usedBalance + days;
    const newRemaining = balance.totalEntitlement - newUsed;

    return this.prisma.hrLeaveBalance.update({
      where: { id: balance.id },
      data: {
        usedBalance: newUsed,
        remainingBalance: newRemaining,
      },
    });
  }

  // ==========================================
  // Check if balance is sufficient
  // ==========================================
  async checkBalance(userId: number, leaveTypeId: number, days: number): Promise<boolean> {
    const currentYear = new Date().getFullYear();

    const balance = await this.prisma.hrLeaveBalance.findFirst({
      where: {
        userId,
        leaveTypeId,
        year: currentYear,
      },
    });

    if (!balance) {
      return false;
    }

    return balance.remainingBalance >= days;
  }

  // ==========================================
  // Restore Balance (when leave is cancelled)
  // ==========================================
  async restoreBalance(userId: number, leaveTypeId: number, days: number) {
    const currentYear = new Date().getFullYear();

    const balance = await this.prisma.hrLeaveBalance.findFirst({
      where: {
        userId,
        leaveTypeId,
        year: currentYear,
      },
    });

    if (!balance) {
      throw new NotFoundException('Leave balance not found');
    }

    const newUsed = Math.max(0, balance.usedBalance - days);
    const newRemaining = balance.totalEntitlement - newUsed;

    return this.prisma.hrLeaveBalance.update({
      where: { id: balance.id },
      data: {
        usedBalance: newUsed,
        remainingBalance: newRemaining,
      },
    });
  }

  // ==========================================
  // Get Balance History
  // ==========================================
  async getBalanceHistory(balanceId: number) {
    await this.findOne(balanceId);

    return this.prisma.hrLeaveBalanceHistory.findMany({
      where: { balanceId: balanceId },
      include: {
        changedBy: {
          select: {
            id: true,
            displayName: true,
            userLogin: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================
  // Delete Leave Balance
  // ==========================================
  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.hrLeaveBalance.delete({
      where: { id },
    });
  }
}
