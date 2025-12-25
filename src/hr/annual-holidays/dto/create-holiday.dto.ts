import { IsString, IsDateString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { HolidayType } from '@prisma/client';

export class CreateHolidayDto {
  @IsString()
  name: string;

  @IsDateString()
  date: string;

  @IsEnum(HolidayType)
  type: HolidayType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}
