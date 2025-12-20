import { IsString } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  roleCode: string; // system_admin, hr_admin, ...
}
