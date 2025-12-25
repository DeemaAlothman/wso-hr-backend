import { IsNumber, IsOptional, Min } from 'class-validator';

export class CreateLeaveBalanceDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  leaveTypeId: number;

  @IsNumber()
  @Min(0)
  totalEntitlement: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  used?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pending?: number;

  @IsOptional()
  @IsNumber()
  carryoverFromPreviousYear?: number;
}
