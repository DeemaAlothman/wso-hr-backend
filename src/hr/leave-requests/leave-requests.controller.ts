import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { ApproveRejectDto } from './dto/approve-reject.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { LeaveRequestStatus } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/hr/leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequests: LeaveRequestsService) {}

  // ==========================================
  // Get All Leave Requests (HR/Admin)
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer')
  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: LeaveRequestStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaveRequests.findAll(
      userId ? Number(userId) : undefined,
      status,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  // ==========================================
  // Get My Leave Requests
  // ==========================================
  @Get('my-requests')
  getMyRequests(
    @Req() req: any,
    @Query('status') status?: LeaveRequestStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaveRequests.getMyRequests(
      req.user.sub,
      status,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  // ==========================================
  // Get Pending for Manager
  // ==========================================
  @Roles('manager')
  @Get('pending-manager')
  getPendingForManager(@Req() req: any) {
    return this.leaveRequests.getPendingForManager(req.user.sub);
  }

  // ==========================================
  // Get Pending for HR
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Get('pending-hr')
  getPendingForHR() {
    return this.leaveRequests.getPendingForHR();
  }

  // ==========================================
  // Get Leave Request by ID
  // ==========================================
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leaveRequests.findOne(Number(id));
  }

  // ==========================================
  // Create Leave Request
  // ==========================================
  @Post()
  create(@Req() req: any, @Body() dto: CreateLeaveRequestDto) {
    return this.leaveRequests.create(req.user.sub, dto);
  }

  // ==========================================
  // Update Leave Request
  // ==========================================
  @Put(':id')
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateLeaveRequestDto,
  ) {
    return this.leaveRequests.update(Number(id), req.user.sub, dto);
  }

  // ==========================================
  // Manager Approve
  // ==========================================
  @Roles('manager')
  @Patch(':id/manager-approve')
  managerApprove(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ApproveRejectDto,
  ) {
    return this.leaveRequests.managerApprove(Number(id), req.user.sub, dto);
  }

  // ==========================================
  // Manager Reject
  // ==========================================
  @Roles('manager')
  @Patch(':id/manager-reject')
  managerReject(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ApproveRejectDto,
  ) {
    return this.leaveRequests.managerReject(Number(id), req.user.sub, dto);
  }

  // ==========================================
  // HR Approve
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Patch(':id/hr-approve')
  hrApprove(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ApproveRejectDto,
  ) {
    return this.leaveRequests.hrApprove(Number(id), req.user.sub, dto);
  }

  // ==========================================
  // HR Reject
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Patch(':id/hr-reject')
  hrReject(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ApproveRejectDto,
  ) {
    return this.leaveRequests.hrReject(Number(id), req.user.sub, dto);
  }

  // ==========================================
  // Cancel Request
  // ==========================================
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Req() req: any,
    @Body('reason') reason: string,
  ) {
    return this.leaveRequests.cancel(Number(id), req.user.sub, reason);
  }

  // ==========================================
  // Delete Leave Request
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leaveRequests.remove(Number(id));
  }
}
