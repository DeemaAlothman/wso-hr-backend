import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';

@Injectable()
export class LeaveTypesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Get All Leave Types
  // ==========================================
  async findAll(isActive?: boolean) {
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.hrLeaveType.findMany({
      where,
      orderBy: { leaveTypeName: 'asc' },
    });
  }

  // ==========================================
  // Get Leave Type by ID
  // ==========================================
  async findOne(id: number) {
    const leaveType = await this.prisma.hrLeaveType.findUnique({
      where: { id },
    });

    if (!leaveType) {
      throw new NotFoundException(`Leave type #${id} not found`);
    }

    return leaveType;
  }

  // ==========================================
  // Create Leave Type
  // ==========================================
  async create(dto: CreateLeaveTypeDto) {
    // Check if code already exists
    const existing = await this.prisma.hrLeaveType.findUnique({
      where: { leaveTypeCode: dto.leaveTypeCode },
    });

    if (existing) {
      throw new ConflictException(`Leave type code "${dto.leaveTypeCode}" already exists`);
    }

    return this.prisma.hrLeaveType.create({
      data: {
        leaveTypeName: dto.leaveTypeName,
        leaveTypeCode: dto.leaveTypeCode,
        description: dto.description,
        annualEntitlement: dto.annualEntitlement,
        maxConsecutiveDays: dto.maxConsecutiveDays ?? 0,
        requiresApproval: dto.requiresApproval ?? true,
        requiresAttachment: dto.requiresAttachment ?? false,
        isPaid: dto.isPaid ?? true,
        affectsSalary: dto.affectsSalary ?? false,
        isCarryoverAllowed: dto.isCarryoverAllowed ?? false,
        maxCarryoverDays: dto.maxCarryoverDays ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  // ==========================================
  // Update Leave Type
  // ==========================================
  async update(id: number, dto: UpdateLeaveTypeDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.hrLeaveType.update({
      where: { id },
      data: dto,
    });
  }

  // ==========================================
  // Toggle Active Status
  // ==========================================
  async toggleActive(id: number) {
    const leaveType = await this.findOne(id);

    return this.prisma.hrLeaveType.update({
      where: { id },
      data: { isActive: !leaveType.isActive },
    });
  }

  // ==========================================
  // Delete Leave Type (soft - just deactivate)
  // ==========================================
  async remove(id: number) {
    await this.findOne(id);

    // Instead of deleting, we deactivate it
    return this.prisma.hrLeaveType.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
