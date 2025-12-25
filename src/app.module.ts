import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { RolesModule } from './roles/roles.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LeaveTypesModule } from './hr/leave-types.module';
import { LeaveBalanceModule } from './hr/leave-balance.module';
import { LeaveRequestsModule } from './hr/leave-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    RolesModule,
    ActivityLogsModule,
    NotificationsModule,
    LeaveTypesModule,
    LeaveBalanceModule,
    LeaveRequestsModule,
  ],
})
export class AppModule {}
