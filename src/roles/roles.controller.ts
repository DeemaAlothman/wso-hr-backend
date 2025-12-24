import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  // حسب التوصيف: system_admin & hr_admin لازم يشوفوا roles لإدارة المستخدمين
  @Roles('system_admin', 'hr_admin')
  @Get()
  list(@Query('isActive') isActive?: string) {
    const parsed =
      isActive === undefined ? undefined : isActive === 'true' ? true : false;

    return this.roles.list(parsed);
  }
}
