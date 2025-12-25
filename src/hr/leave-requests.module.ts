import { Module } from '@nestjs/common';
import { LeaveRequestsController } from './leave-requests/leave-requests.controller';
import { LeaveRequestsService } from './leave-requests/leave-requests.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaveBalanceModule } from './leave-balance.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, LeaveBalanceModule, NotificationsModule],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService],
  exports: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
