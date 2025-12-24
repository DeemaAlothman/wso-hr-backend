import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateLeaveTypeDto {
  @IsString()
  leaveTypeName: string;

  @IsString()
  leaveTypeCode: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  annualEntitlement: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxConsecutiveDays?: number;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresAttachment?: boolean;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @IsOptional()
  @IsBoolean()
  affectsSalary?: boolean;

  @IsOptional()
  @IsBoolean()
  isCarryoverAllowed?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCarryoverDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
