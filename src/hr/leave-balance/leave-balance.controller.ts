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
import { LeaveBalanceService } from './leave-balance.service';
import { CreateLeaveBalanceDto } from './dto/create-leave-balance.dto';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/hr/leave-balance')
export class LeaveBalanceController {
  constructor(private readonly leaveBalance: LeaveBalanceService) {}

  // ==========================================
  // Get All Leave Balances (HR Admin)
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer')
  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('leaveTypeId') leaveTypeId?: string,
    @Query('year') year?: string,
  ) {
    return this.leaveBalance.findAll(
      userId ? Number(userId) : undefined,
      leaveTypeId ? Number(leaveTypeId) : undefined,
      year ? Number(year) : undefined,
    );
  }

  // ==========================================
  // Get My Leave Balances (Employee)
  // ==========================================
  @Get('my-balances')
  getMyBalances(@Req() req: any, @Query('year') year?: string) {
    const userId = req.user.sub;
    return this.leaveBalance.getUserBalances(
      userId,
      year ? Number(year) : undefined,
    );
  }

  // ==========================================
  // Get User's Leave Balances (HR can view any user)
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer', 'manager')
  @Get('user/:userId')
  getUserBalances(
    @Param('userId') userId: string,
    @Query('year') year?: string,
  ) {
    return this.leaveBalance.getUserBalances(
      Number(userId),
      year ? Number(year) : undefined,
    );
  }

  // ==========================================
  // Get Balance by ID
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leaveBalance.findOne(Number(id));
  }

  // ==========================================
  // Create Leave Balance
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Post()
  create(@Body() dto: CreateLeaveBalanceDto) {
    return this.leaveBalance.create(dto);
  }

  // ==========================================
  // Initialize Balances for User
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Post('initialize/:userId')
  initializeUserBalances(@Param('userId') userId: string) {
    return this.leaveBalance.initializeUserBalances(Number(userId));
  }

  // ==========================================
  // Update Leave Balance
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeaveBalanceDto) {
    return this.leaveBalance.update(Number(id), dto);
  }

  // ==========================================
  // Adjust Balance (Manual)
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Patch(':id/adjust')
  adjustBalance(
    @Param('id') id: string,
    @Body() dto: AdjustBalanceDto,
    @Req() req: any,
  ) {
    return this.leaveBalance.adjustBalance(Number(id), dto, req.user.sub);
  }

  // ==========================================
  // Get Balance History
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer')
  @Get(':id/history')
  getBalanceHistory(@Param('id') id: string) {
    return this.leaveBalance.getBalanceHistory(Number(id));
  }

  // ==========================================
  // Delete Leave Balance
  // ==========================================
  @Roles('system_admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leaveBalance.remove(Number(id));
  }
}
