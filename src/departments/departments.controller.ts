import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Roles('system_admin', 'hr_admin')
  @Get()
  list() {
    return this.departments.list();
  }

  @Roles('system_admin', 'hr_admin')
  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departments.create(dto);
  }

  @Roles('system_admin', 'hr_admin')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.departments.getById(Number(id));
  }

  @Roles('system_admin', 'hr_admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departments.update(Number(id), dto);
  }

  @Roles('system_admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.departments.remove(Number(id));
  }

  @Roles('system_admin', 'hr_admin')
  @Get(':id/users')
  users(@Param('id') id: string) {
    return this.departments.getUsers(Number(id));
  }
}
