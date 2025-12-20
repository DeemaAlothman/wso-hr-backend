import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsInt,
  IsBoolean,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  userLogin: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
