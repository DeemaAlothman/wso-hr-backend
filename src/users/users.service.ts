import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: number;
    isActive?: boolean;
  }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { userLogin: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (typeof query.departmentId === 'number')
      where.departmentId = query.departmentId;
    if (typeof query.isActive === 'boolean') where.isActive = query.isActive;

    const [items, total] = await Promise.all([
      this.prisma.wsoSysUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        include: { department: true, roles: { include: { role: true } } },
      }),
      this.prisma.wsoSysUser.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      items: items.map((u) => ({
        id: u.id,
        userLogin: u.userLogin,
        email: u.email,
        displayName: u.displayName,
        isActive: u.isActive,
        department: u.department?.name ?? null,
        roles: u.roles.map((r) => r.role.code),
        createdAt: u.createdAt,
      })),
    };
  }

  async getById(id: number) {
    const user = await this.prisma.wsoSysUser.findUnique({
      where: { id },
      include: { department: true, roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      userLogin: user.userLogin,
      email: user.email,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      departmentId: user.departmentId,
      department: user.department?.name ?? null,
      position: user.position,
      phone: user.phone,
      mobile: user.mobile,
      employeeNo: user.employeeNo,
      gender: user.gender,
      nationality: user.nationality,
      nationalId: user.nationalId,
      birthDate: user.birthDate,
      hireDate: user.hireDate,
      roles: user.roles.map((r) => r.role.code),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async create(dto: CreateUserDto) {
    const existsLogin = await this.prisma.wsoSysUser.findUnique({
      where: { userLogin: dto.userLogin },
    });
    if (existsLogin) throw new BadRequestException('userLogin already exists');

    const existsEmail = await this.prisma.wsoSysUser.findUnique({
      where: { email: dto.email },
    });
    if (existsEmail) throw new BadRequestException('email already exists');

    if (dto.departmentId) {
      const departmentExists = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!departmentExists)
        throw new BadRequestException('Department not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.wsoSysUser.create({
      data: {
        userLogin: dto.userLogin,
        email: dto.email,
        passwordHash,
        isActive: dto.isActive ?? true,
        displayName: dto.displayName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        departmentId: dto.departmentId,
        position: dto.position,
        phone: dto.phone,
        mobile: dto.mobile,
        employeeNo: dto.employeeNo,
        gender: dto.gender,
        nationality: dto.nationality,
        nationalId: dto.nationalId,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
      },
    });

    return this.getById(user.id);
  }

  async update(id: number, dto: UpdateUserDto) {
    const existing = await this.prisma.wsoSysUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== existing.email) {
      const existsEmail = await this.prisma.wsoSysUser.findUnique({
        where: { email: dto.email },
      });
      if (existsEmail) throw new BadRequestException('email already exists');
    }

    if (dto.departmentId) {
      const departmentExists = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!departmentExists)
        throw new BadRequestException('Department not found');
    }

    const updateData: any = {
      email: dto.email,
      displayName: dto.displayName,
      firstName: dto.firstName,
      lastName: dto.lastName,
      departmentId: dto.departmentId,
      position: dto.position,
      isActive: dto.isActive,
      phone: dto.phone,
      mobile: dto.mobile,
      employeeNo: dto.employeeNo,
      gender: dto.gender,
      nationality: dto.nationality,
      nationalId: dto.nationalId,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
    };

    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.prisma.wsoSysUser.update({
      where: { id },
      data: updateData,
    });

    return this.getById(id);
  }

  async remove(id: number) {
    const existing = await this.prisma.wsoSysUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    await this.prisma.wsoSysUser.delete({ where: { id } });
    return { success: true };
  }

  async activate(id: number) {
    await this.prisma.wsoSysUser.update({
      where: { id },
      data: { isActive: true },
    });
    return { success: true };
  }

  async deactivate(id: number) {
    await this.prisma.wsoSysUser.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }

  async assignRole(userId: number, roleCode: string, assignedBy?: number) {
    const user = await this.prisma.wsoSysUser.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    const role = await this.prisma.wsoRole.findUnique({
      where: { code: roleCode },
    });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.wsoUserRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id, assignedBy },
    });

    return { success: true };
  }

  async removeRole(userId: number, roleCode: string) {
    const role = await this.prisma.wsoRole.findUnique({
      where: { code: roleCode },
    });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.wsoUserRole.delete({
      where: { userId_roleId: { userId, roleId: role.id } },
    });

    return { success: true };
  }

  async setAvatarUrl(userId: number, avatarUrl: string) {
    await this.prisma.wsoSysUser.update({
      where: { id: userId },
      data: { avatarUrl },
    });
    return { success: true, avatarUrl };
  }

  async setSignatureUrl(userId: number, signatureUrl: string) {
    await this.prisma.wsoSysUser.update({
      where: { id: userId },
      data: { signatureUrl },
    });
    return { success: true, signatureUrl };
  }
}
