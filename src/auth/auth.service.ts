import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async login(
    userLogin: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
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

    // Generate Access Token
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        userLogin: user.userLogin,
        roles,
      },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    // Generate Refresh Token
    const refreshToken = await this.jwt.signAsync(
      {
        sub: user.id,
        userLogin: user.userLogin,
      },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    // Update last login info
    await this.prisma.wsoSysUser.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        lastLoginUserAgent: userAgent,
      },
    });

    // Log activity
    await this.activityLogs.create({
      userId: user.id,
      action: 'login',
      description: `User ${user.userLogin} logged in`,
      ipAddress,
      userAgent,
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
      refreshToken,
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

  // ==========================================
  // Refresh Token
  // ==========================================
  async refresh(userId: number) {
    const user = await this.prisma.wsoSysUser.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    if (!user.isActive) throw new UnauthorizedException('Account disabled');

    const roles = user.roles.map((ur) => ur.role.code);

    // Generate new Access Token
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        userLogin: user.userLogin,
        roles,
      },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    // Generate new Refresh Token
    const refreshToken = await this.jwt.signAsync(
      {
        sub: user.id,
        userLogin: user.userLogin,
      },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  // ==========================================
  // Logout
  // ==========================================
  async logout(userId: number) {
    // يمكن تخزين refresh token في database وحذفه هنا
    // حالياً نرجع success مباشرة
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  // ==========================================
  // Change Password
  // ==========================================
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.wsoSysUser.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.wsoSysUser.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
      },
    });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }
}
