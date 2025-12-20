import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  userLogin: string;

  @IsString()
  @MinLength(6)
  password: string;
}
