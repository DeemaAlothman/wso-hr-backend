import { IsNumber, IsString, IsOptional } from 'class-validator';

export class AdjustBalanceDto {
  @IsNumber()
  adjustmentDays: number; // Can be positive or negative

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
