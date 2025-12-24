import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ActivityAction } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogs: ActivityLogsService) {}

  // ==========================================
  // Get All Activity Logs (Admin only)
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: ActivityAction,
    @Query('entityType') entityType?: string,
  ) {
    return this.activityLogs.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      userId: userId ? Number(userId) : undefined,
      action,
      entityType,
    });
  }

  // ==========================================
  // Get Activity Logs by User ID
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogs.findByUser(
      Number(userId),
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  // ==========================================
  // Get Activity Logs by Entity
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Get('entity/:type/:id')
  findByEntity(
    @Param('type') type: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogs.findByEntity(
      type,
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }
}
