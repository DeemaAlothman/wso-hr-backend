import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaveRequestStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Leave Requests Summary Report
  // ==========================================
  async getLeaveRequestsSummary(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [total, byStatus, byLeaveType] = await Promise.all([
      // Total requests
      this.prisma.hrLeaveRequest.count({ where }),

      // By status
      this.prisma.hrLeaveRequest.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),

      // By leave type
      this.prisma.hrLeaveRequest.groupBy({
        by: ['leaveTypeId'],
        where,
        _count: true,
        _sum: {
          totalDays: true,
        },
      }),
    ]);

    // Get leave type names
    const leaveTypeIds = byLeaveType.map((item) => item.leaveTypeId);
    const leaveTypes = await this.prisma.hrLeaveType.findMany({
      where: { id: { in: leaveTypeIds } },
      select: { id: true, leaveTypeName: true },
    });

    const byLeaveTypeWithNames = byLeaveType.map((item) => ({
      leaveType: leaveTypes.find((lt) => lt.id === item.leaveTypeId)?.leaveTypeName,
      count: item._count,
      totalDays: item._sum.totalDays || 0,
    }));

    return {
      total,
      byStatus: byStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
      byLeaveType: byLeaveTypeWithNames,
    };
  }

  // ==========================================
  // Employee Leave Balance Report
  // ==========================================
  async getEmployeeBalanceReport(userId?: number, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const where: any = { year: currentYear };

    if (userId) {
      where.userId = userId;
    }

    const balances = await this.prisma.hrLeaveBalance.findMany({
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

    return balances.map((balance) => ({
      user: balance.user,
      leaveType: balance.leaveType,
      year: balance.year,
      totalEntitlement: balance.totalEntitlement,
      usedBalance: balance.usedBalance,
      remainingBalance: balance.remainingBalance,
      carriedOver: balance.carriedOver,
      utilizationRate: balance.totalEntitlement > 0
        ? ((balance.usedBalance / balance.totalEntitlement) * 100).toFixed(2) + '%'
        : '0%',
    }));
  }

  // ==========================================
  // Department Leave Statistics
  // ==========================================
  async getDepartmentLeaveStats(departmentId?: number, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const where: any = {
      createdAt: {
        gte: startOfYear,
        lte: endOfYear,
      },
    };

    if (departmentId) {
      // Get users in this department
      const department = await this.prisma.department.findUnique({
        where: { id: departmentId },
        include: {
          users: {
            select: { id: true },
          },
        },
      });

      if (department) {
        const userIds = department.users.map((u) => u.id);
        where.userId = { in: userIds };
      }
    }

    const [totalRequests, approvedRequests, pendingRequests, rejectedRequests] = await Promise.all([
      this.prisma.hrLeaveRequest.count({ where }),
      this.prisma.hrLeaveRequest.count({
        where: { ...where, status: LeaveRequestStatus.approved_hr },
      }),
      this.prisma.hrLeaveRequest.count({
        where: {
          ...where,
          status: {
            in: [LeaveRequestStatus.pending_manager, LeaveRequestStatus.pending_hr],
          },
        },
      }),
      this.prisma.hrLeaveRequest.count({
        where: {
          ...where,
          status: {
            in: [LeaveRequestStatus.rejected_manager, LeaveRequestStatus.rejected_hr],
          },
        },
      }),
    ]);

    const totalDaysUsed = await this.prisma.hrLeaveRequest.aggregate({
      where: { ...where, status: LeaveRequestStatus.approved_hr },
      _sum: {
        totalDays: true,
      },
    });

    return {
      year: currentYear,
      totalRequests,
      approvedRequests,
      pendingRequests,
      rejectedRequests,
      totalDaysUsed: totalDaysUsed._sum.totalDays || 0,
      approvalRate: totalRequests > 0
        ? ((approvedRequests / totalRequests) * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  // ==========================================
  // Top Leave Requesters Report
  // ==========================================
  async getTopLeaveRequesters(limit: number = 10, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const requests = await this.prisma.hrLeaveRequest.groupBy({
      by: ['userId'],
      where: {
        status: LeaveRequestStatus.approved_hr,
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      _count: true,
      _sum: {
        totalDays: true,
      },
      orderBy: {
        _sum: {
          totalDays: 'desc',
        },
      },
      take: limit,
    });

    // Get user details
    const userIds = requests.map((r) => r.userId);
    const users = await this.prisma.wsoSysUser.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        userLogin: true,
        displayName: true,
        email: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return requests.map((request) => {
      const user = users.find((u) => u.id === request.userId);
      return {
        user: {
          id: user?.id,
          displayName: user?.displayName,
          email: user?.email,
          department: user?.department?.name,
        },
        totalRequests: request._count,
        totalDaysUsed: request._sum.totalDays || 0,
      };
    });
  }

  // ==========================================
  // Monthly Leave Trend Report
  // ==========================================
  async getMonthlyLeaveTrend(year?: number) {
    const currentYear = year || new Date().getFullYear();

    const months: any[] = [];
    for (let month = 0; month < 12; month++) {
      const startOfMonth = new Date(currentYear, month, 1);
      const endOfMonth = new Date(currentYear, month + 1, 0, 23, 59, 59);

      const [totalRequests, approvedRequests, totalDays] = await Promise.all([
        this.prisma.hrLeaveRequest.count({
          where: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }),
        this.prisma.hrLeaveRequest.count({
          where: {
            status: LeaveRequestStatus.approved_hr,
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        }),
        this.prisma.hrLeaveRequest.aggregate({
          where: {
            status: LeaveRequestStatus.approved_hr,
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          _sum: {
            totalDays: true,
          },
        }),
      ]);

      months.push({
        month: month + 1,
        monthName: new Date(currentYear, month).toLocaleString('default', { month: 'long' }),
        totalRequests,
        approvedRequests,
        totalDays: totalDays._sum.totalDays || 0,
      });
    }

    return {
      year: currentYear,
      months,
    };
  }

  // ==========================================
  // Leave Type Utilization Report
  // ==========================================
  async getLeaveTypeUtilization(year?: number) {
    const currentYear = year || new Date().getFullYear();

    // Get all active leave types
    const leaveTypes = await this.prisma.hrLeaveType.findMany({
      where: { isActive: true },
    });

    const utilization = await Promise.all(
      leaveTypes.map(async (leaveType) => {
        const [totalEntitlement, totalRequestsCount, totalRequestsAgg] = await Promise.all([
          this.prisma.hrLeaveBalance.aggregate({
            where: {
              leaveTypeId: leaveType.id,
              year: currentYear,
            },
            _sum: {
              totalEntitlement: true,
              usedBalance: true,
            },
          }),
          this.prisma.hrLeaveRequest.count({
            where: {
              leaveTypeId: leaveType.id,
              status: LeaveRequestStatus.approved_hr,
            },
          }),
          this.prisma.hrLeaveRequest.aggregate({
            where: {
              leaveTypeId: leaveType.id,
              status: LeaveRequestStatus.approved_hr,
            },
            _sum: {
              totalDays: true,
            },
          }),
        ]);

        const totalEntitlementDays = totalEntitlement._sum.totalEntitlement || 0;
        const totalUsedDays = totalEntitlement._sum.usedBalance || 0;

        return {
          leaveType: {
            id: leaveType.id,
            name: leaveType.leaveTypeName,
            code: leaveType.leaveTypeCode,
          },
          totalEntitlement: totalEntitlementDays,
          totalUsed: totalUsedDays,
          totalRemaining: totalEntitlementDays - totalUsedDays,
          utilizationRate: totalEntitlementDays > 0
            ? ((totalUsedDays / totalEntitlementDays) * 100).toFixed(2) + '%'
            : '0%',
          totalRequests: totalRequestsCount,
          totalDaysApproved: totalRequestsAgg._sum.totalDays || 0,
        };
      }),
    );

    return {
      year: currentYear,
      leaveTypes: utilization,
    };
  }

  // ==========================================
  // User Leave History Report
  // ==========================================
  async getUserLeaveHistory(userId: number, year?: number) {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const [user, balances, requests] = await Promise.all([
      this.prisma.wsoSysUser.findUnique({
        where: { id: userId },
        select: {
          id: true,
          userLogin: true,
          displayName: true,
          email: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.hrLeaveBalance.findMany({
        where: {
          userId,
          year: currentYear,
        },
        include: {
          leaveType: true,
        },
      }),
      this.prisma.hrLeaveRequest.findMany({
        where: {
          userId,
          createdAt: {
            gte: startOfYear,
            lte: endOfYear,
          },
        },
        include: {
          leaveType: {
            select: {
              id: true,
              leaveTypeName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      year: currentYear,
      user,
      balances: balances.map((b) => ({
        leaveType: b.leaveType.leaveTypeName,
        totalEntitlement: b.totalEntitlement,
        usedBalance: b.usedBalance,
        remainingBalance: b.remainingBalance,
        carriedOver: b.carriedOver,
      })),
      requests: requests.map((r) => ({
        id: r.id,
        requestNumber: r.requestNumber,
        leaveType: r.leaveType.leaveTypeName,
        startDate: r.startDate,
        endDate: r.endDate,
        totalDays: r.totalDays,
        status: r.status,
        reason: r.reason,
        submittedDate: r.submittedDate,
      })),
      statistics: {
        totalRequests: requests.length,
        approvedRequests: requests.filter((r) => r.status === LeaveRequestStatus.approved_hr).length,
        pendingRequests: requests.filter((r) =>
          r.status === LeaveRequestStatus.pending_manager ||
          r.status === LeaveRequestStatus.pending_hr
        ).length,
        rejectedRequests: requests.filter((r) =>
          r.status === LeaveRequestStatus.rejected_manager ||
          r.status === LeaveRequestStatus.rejected_hr
        ).length,
        totalDaysApproved: requests
          .filter((r) => r.status === LeaveRequestStatus.approved_hr)
          .reduce((sum, r) => sum + r.totalDays, 0),
      },
    };
  }
}
