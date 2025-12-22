import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  // null يعني إزالة parent
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  // null يعني إزالة manager
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerId?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
