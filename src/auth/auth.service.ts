import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(userLogin: string, password: string) {
    const user = await this.prisma.wsoSysUser.findUnique({
      where: { userLogin },
      include: {
        department: true,
        roles: { include: { role: true } },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account disabled');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const roles = user.roles.map((ur) => ur.role.code);

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      userLogin: user.userLogin,
      roles,
    });

    return {
      user: {
        id: user.id,
        userLogin: user.userLogin,
        displayName: user.displayName,
        email: user.email,
        roles,
        department: user.department?.name ?? null,
      },
      accessToken,
    };
  }

  async me(userId: number) {
    const user = await this.prisma.wsoSysUser.findUnique({
      where: { id: userId },
      include: {
        department: true,
        roles: { include: { role: true } },
      },
    });
    if (!user) return null;

    const roles = user.roles.map((ur) => ur.role.code);

    return {
      id: user.id,
      userLogin: user.userLogin,
      displayName: user.displayName,
      email: user.email,
      roles,
      department: user.department?.name ?? null,
    };
  }
}
