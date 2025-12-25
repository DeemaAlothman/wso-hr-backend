import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnnualHolidaysService } from './annual-holidays.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { HolidayType } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/hr/holidays')
export class AnnualHolidaysController {
  constructor(private readonly holidays: AnnualHolidaysService) {}

  // ==========================================
  // Get All Holidays (Any authenticated user)
  // ==========================================
  @Get()
  findAll(@Query('year') year?: string, @Query('type') type?: HolidayType) {
    return this.holidays.findAll(
      year ? Number(year) : undefined,
      type,
    );
  }

  // ==========================================
  // Get Current Year Holidays
  // ==========================================
  @Get('current-year')
  getCurrentYearHolidays() {
    return this.holidays.getCurrentYearHolidays();
  }

  // ==========================================
  // Get Upcoming Holidays
  // ==========================================
  @Get('upcoming')
  getUpcomingHolidays(@Query('limit') limit?: string) {
    return this.holidays.getUpcomingHolidays(limit ? Number(limit) : 5);
  }

  // ==========================================
  // Get Holiday by ID
  // ==========================================
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.holidays.findOne(Number(id));
  }

  // ==========================================
  // Create Holiday (HR Admin only)
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Post()
  create(@Body() dto: CreateHolidayDto) {
    return this.holidays.create(dto);
  }

  // ==========================================
  // Update Holiday (HR Admin only)
  // ==========================================
  @Roles('system_admin', 'hr_admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.holidays.update(Number(id), dto);
  }

  // ==========================================
  // Delete Holiday (System Admin only)
  // ==========================================
  @Roles('system_admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.holidays.remove(Number(id));
  }
}
