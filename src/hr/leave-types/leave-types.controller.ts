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
  UseGuards,
} from '@nestjs/common';
import { LeaveTypesService } from './leave-types.service';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/hr/leave-types')
export class LeaveTypesController {
  constructor(private readonly leaveTypes: LeaveTypesService) {}

  // ==========================================
  // Get All Leave Types
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer')
  @Get()
  findAll(@Query('isActive') isActive?: string) {
    const isActiveFilter =
      isActive === undefined
        ? undefined
        : isActive === 'true'
          ? true
          : isActive === 'false'
            ? false
            : undefined;

    return this.leaveTypes.findAll(isActiveFilter);
  }

  // ==========================================
  // Get Leave Type by ID
  // ==========================================
  @Roles('system_admin', 'hr_admin', 'hr_officer')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leaveTypes.findOne(Number(id));
  }

  // ==========================================
  // Create Leave Type
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Post()
  create(@Body() dto: CreateLeaveTypeDto) {
    return this.leaveTypes.create(dto);
  }

  // ==========================================
  // Update Leave Type
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeaveTypeDto) {
    return this.leaveTypes.update(Number(id), dto);
  }

  // ==========================================
  // Toggle Active Status
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Patch(':id/toggle')
  toggleActive(@Param('id') id: string) {
    return this.leaveTypes.toggleActive(Number(id));
  }

  // ==========================================
  // Delete (Deactivate) Leave Type
  // ==========================================
  @Roles('system_admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leaveTypes.remove(Number(id));
  }
}
