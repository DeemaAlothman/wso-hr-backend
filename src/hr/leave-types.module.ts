import { Module } from '@nestjs/common';
import { LeaveTypesController } from './leave-types/leave-types.controller';
import { LeaveTypesService } from './leave-types/leave-types.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LeaveTypesController],
  providers: [LeaveTypesService],
  exports: [LeaveTypesService],
})
export class LeaveTypesModule {}
