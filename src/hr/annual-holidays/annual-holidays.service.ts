import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { HolidayType } from '@prisma/client';

@Injectable()
export class AnnualHolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Calculate Days Between Dates
  // ==========================================
  private calculateDays(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // ==========================================
  // Get All Holidays
  // ==========================================
  async findAll(year?: number, type?: HolidayType) {
    const where: any = {};

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      where.startDate = {
        gte: startOfYear,
        lte: endOfYear,
      };
    }

    if (type) {
      where.holidayType = type;
    }

    return this.prisma.hrAnnualHoliday.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
  }

  // ==========================================
  // Get Current Year Holidays
  // ==========================================
  async getCurrentYearHolidays() {
    const currentYear = new Date().getFullYear();
    return this.findAll(currentYear);
  }

  // ==========================================
  // Get Upcoming Holidays
  // ==========================================
  async getUpcomingHolidays(limit: number = 5) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.hrAnnualHoliday.findMany({
      where: {
        startDate: {
          gte: today,
        },
      },
      orderBy: { startDate: 'asc' },
      take: limit,
    });
  }

  // ==========================================
  // Get Holiday by ID
  // ==========================================
  async findOne(id: number) {
    const holiday = await this.prisma.hrAnnualHoliday.findUnique({
      where: { id },
    });

    if (!holiday) {
      throw new NotFoundException(`Holiday #${id} not found`);
    }

    return holiday;
  }

  // ==========================================
  // Create Holiday
  // ==========================================
  async create(dto: CreateHolidayDto) {
    const startDate = new Date(dto.date);
    const endDate = new Date(dto.date);
    const totalDays = 1;

    return this.prisma.hrAnnualHoliday.create({
      data: {
        holidayName: dto.name,
        holidayType: dto.type,
        startDate,
        endDate,
        totalDays,
        description: dto.description,
        isRecurring: dto.isRecurring || false,
      },
    });
  }

  // ==========================================
  // Update Holiday
  // ==========================================
  async update(id: number, dto: UpdateHolidayDto) {
    await this.findOne(id);

    const startDate = dto.date ? new Date(dto.date) : undefined;
    const endDate = dto.date ? new Date(dto.date) : undefined;

    return this.prisma.hrAnnualHoliday.update({
      where: { id },
      data: {
        holidayName: dto.name,
        holidayType: dto.type,
        startDate,
        endDate,
        totalDays: 1,
        description: dto.description,
        isRecurring: dto.isRecurring,
      },
    });
  }

  // ==========================================
  // Delete Holiday
  // ==========================================
  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.hrAnnualHoliday.delete({
      where: { id },
    });
  }

  // ==========================================
  // Check if Date is Holiday
  // ==========================================
  async isHoliday(date: Date): Promise<boolean> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    const holiday = await this.prisma.hrAnnualHoliday.findFirst({
      where: {
        startDate: {
          lte: endOfDay,
        },
        endDate: {
          gte: startOfDay,
        },
      },
    });

    return !!holiday;
  }

  // ==========================================
  // Get Holidays Between Dates
  // ==========================================
  async getHolidaysBetweenDates(startDate: Date, endDate: Date) {
    return this.prisma.hrAnnualHoliday.findMany({
      where: {
        startDate: {
          lte: endDate,
        },
        endDate: {
          gte: startDate,
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }
}
