import { Module } from '@nestjs/common';
import { LeaveBalanceController } from './leave-balance/leave-balance.controller';
import { LeaveBalanceService } from './leave-balance/leave-balance.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LeaveBalanceController],
  providers: [LeaveBalanceService],
  exports: [LeaveBalanceService],
})
export class LeaveBalanceModule {}
