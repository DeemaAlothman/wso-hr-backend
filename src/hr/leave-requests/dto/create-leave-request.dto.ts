import { IsNumber, IsDateString, IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { HalfDayPeriod } from '@prisma/client';

export class CreateLeaveRequestDto {
  @IsNumber()
  leaveTypeId: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isHalfDay?: boolean;

  @IsOptional()
  @IsEnum(HalfDayPeriod)
  halfDayPeriod?: HalfDayPeriod;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  attachmentPath?: string;
}
