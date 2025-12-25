import { IsString, IsOptional } from 'class-validator';

export class ApproveRejectDto {
  @IsOptional()
  @IsString()
  comments?: string;
}
