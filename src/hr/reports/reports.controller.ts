import { Controller, Get, Query, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/hr/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  private validateDate(dateStr: string, paramName: string): Date {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        `Invalid ${paramName} format. Please use YYYY-MM-DD format (e.g., 2025-12-31)`,
      );
    }
    return date;
  }

  // ==========================================
  // Leave Requests Summary Report
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer')
  @Get('leave-requests-summary')
  getLeaveRequestsSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getLeaveRequestsSummary(
      startDate ? this.validateDate(startDate, 'startDate') : undefined,
      endDate ? this.validateDate(endDate, 'endDate') : undefined,
    );
  }

  // ==========================================
  // Employee Balance Report
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer', 'manager')
  @Get('employee-balance')
  getEmployeeBalanceReport(
    @Query('userId') userId?: string,
    @Query('year') year?: string,
  ) {
    return this.reports.getEmployeeBalanceReport(
      userId ? Number(userId) : undefined,
      year ? Number(year) : undefined,
    );
  }

  // ==========================================
  // Department Leave Statistics
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer', 'manager')
  @Get('department-stats')
  getDepartmentLeaveStats(
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
  ) {
    return this.reports.getDepartmentLeaveStats(
      departmentId ? Number(departmentId) : undefined,
      year ? Number(year) : undefined,
    );
  }

  // ==========================================
  // Top Leave Requesters
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer')
  @Get('top-requesters')
  getTopLeaveRequesters(
    @Query('limit') limit?: string,
    @Query('year') year?: string,
  ) {
    return this.reports.getTopLeaveRequesters(
      limit ? Number(limit) : 10,
      year ? Number(year) : undefined,
    );
  }

  // ==========================================
  // Monthly Leave Trend
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer')
  @Get('monthly-trend')
  getMonthlyLeaveTrend(@Query('year') year?: string) {
    return this.reports.getMonthlyLeaveTrend(
      year ? Number(year) : undefined,
    );
  }

  // ==========================================
  // Leave Type Utilization
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer')
  @Get('leave-type-utilization')
  getLeaveTypeUtilization(@Query('year') year?: string) {
    return this.reports.getLeaveTypeUtilization(
      year ? Number(year) : undefined,
    );
  }

  // ==========================================
  // User Leave History
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer', 'manager')
  @Get('user-history/:userId')
  getUserLeaveHistory(
    @Param('userId') userId: string,
    @Query('year') year?: string,
  ) {
    return this.reports.getUserLeaveHistory(
      Number(userId),
      year ? Number(year) : undefined,
    );
  }
}
