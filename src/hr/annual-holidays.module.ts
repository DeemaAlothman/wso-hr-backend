import { Module } from '@nestjs/common';
import { AnnualHolidaysController } from './annual-holidays/annual-holidays.controller';
import { AnnualHolidaysService } from './annual-holidays/annual-holidays.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnnualHolidaysController],
  providers: [AnnualHolidaysService],
  exports: [AnnualHolidaysService],
})
export class AnnualHolidaysModule {}
