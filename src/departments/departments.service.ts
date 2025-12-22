import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.department.findMany({
      orderBy: { id: 'asc' },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        manager: {
          select: { id: true, userLogin: true, displayName: true, email: true },
        },
        _count: { select: { users: true, children: true } },
      },
    });

    return items.map((d) => ({
      ...d,
      usersCount: d._count.users,
      childrenCount: d._count.children,
      _count: undefined,
    }));
  }

  async create(dto: CreateDepartmentDto) {
    // code unique
    const exists = await this.prisma.department.findFirst({
      where: { code: dto.code },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('Department code already exists');

    // parent existence
    if (dto.parentId) {
      const parent = await this.prisma.department.findUnique({
        where: { id: dto.parentId },
        select: { id: true },
      });
      if (!parent) throw new BadRequestException('Parent department not found');
    }

    // manager existence
    if (dto.managerId) {
      const manager = await this.prisma.wsoSysUser.findUnique({
        where: { id: dto.managerId },
        select: { id: true },
      });
      if (!manager) throw new BadRequestException('Manager user not found');
    }

    return this.prisma.department.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
        parentId: dto.parentId ?? null,
        managerId: dto.managerId ?? null,
      },
    });
  }

  async getById(id: number) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: {
          select: { id: true, name: true, code: true, isActive: true },
        },
        manager: {
          select: { id: true, userLogin: true, displayName: true, email: true },
        },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  private async ensureNoHierarchyLoop(deptId: number, newParentId: number) {
    // ممنوع يصير parent هو نفسه أو أحد أولاده
    if (deptId === newParentId)
      throw new BadRequestException('Department cannot be parent of itself');

    let current = newParentId;
    while (current) {
      if (current === deptId) {
        throw new BadRequestException('Invalid parent: creates hierarchy loop');
      }
      const parent = await this.prisma.department.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
      current = parent?.parentId ?? 0;
    }
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!dept) throw new NotFoundException('Department not found');

    // code unique (excluding current)
    if (dto.code) {
      const exists = await this.prisma.department.findFirst({
        where: { code: dto.code, NOT: { id } },
        select: { id: true },
      });
      if (exists)
        throw new BadRequestException('Department code already exists');
    }

    // parent checks
    if (dto.parentId !== undefined && dto.parentId !== null) {
      const parent = await this.prisma.department.findUnique({
        where: { id: dto.parentId },
        select: { id: true },
      });
      if (!parent) throw new BadRequestException('Parent department not found');

      await this.ensureNoHierarchyLoop(id, dto.parentId);
    }

    // manager checks
    if (dto.managerId !== undefined && dto.managerId !== null) {
      const manager = await this.prisma.wsoSysUser.findUnique({
        where: { id: dto.managerId },
        select: { id: true },
      });
      if (!manager) throw new BadRequestException('Manager user not found');
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description:
          dto.description === undefined ? undefined : (dto.description ?? null),
        isActive: dto.isActive,
        parentId: dto.parentId === undefined ? undefined : dto.parentId,
        managerId: dto.managerId === undefined ? undefined : dto.managerId,
      },
    });
  }

  async remove(id: number) {
    // ممنوع حذف قسم إذا فيه users
    const usersCount = await this.prisma.wsoSysUser.count({
      where: { departmentId: id },
    });
    if (usersCount > 0)
      throw new BadRequestException('Cannot delete department that has users');

    // ممنوع حذف قسم إذا عنده children
    const childrenCount = await this.prisma.department.count({
      where: { parentId: id },
    });
    if (childrenCount > 0)
      throw new BadRequestException(
        'Cannot delete department that has sub-departments',
      );

    const dept = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!dept) throw new NotFoundException('Department not found');

    await this.prisma.department.delete({ where: { id } });
    return { success: true };
  }

  async getUsers(id: number) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!dept) throw new NotFoundException('Department not found');

    return this.prisma.wsoSysUser.findMany({
      where: { departmentId: id },
      select: {
        id: true,
        userLogin: true,
        email: true,
        displayName: true,
        isActive: true,
      },
      orderBy: { id: 'asc' },
    });
  }
}
