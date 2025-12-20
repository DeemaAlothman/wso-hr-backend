import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

function safeImageExt(originalName: string) {
  const ext = extname(originalName).toLowerCase();
  const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
  return allowed.includes(ext) ? ext : null;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles('system_admin', 'hr_admin')
  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.users.list({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
      departmentId: departmentId ? Number(departmentId) : undefined,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Roles('system_admin', 'hr_admin')
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Roles('system_admin', 'hr_admin')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.users.getById(Number(id));
  }

  @Roles('system_admin', 'hr_admin')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(Number(id), dto);
  }

  @Roles('system_admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.users.remove(Number(id));
  }

  @Roles('system_admin', 'hr_admin')
  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.users.activate(Number(id));
  }

  @Roles('system_admin', 'hr_admin')
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.users.deactivate(Number(id));
  }

  @Roles('system_admin')
  @Post(':id/roles')
  assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @Req() req: any,
  ) {
    return this.users.assignRole(Number(id), dto.roleCode, req.user?.sub);
  }

  @Roles('system_admin')
  @Delete(':id/roles/:roleCode')
  removeRole(@Param('id') id: string, @Param('roleCode') roleCode: string) {
    return this.users.removeRole(Number(id), roleCode);
  }

  // ==========================
  // Upload Avatar
  // ==========================
  @Roles('system_admin', 'hr_admin')
  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const userId = req.params.id;
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `user-${userId}-${unique}${ext}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');

    const ext = safeImageExt(file.originalname);
    if (!ext) throw new BadRequestException('Only png/jpg/jpeg/webp allowed');

    const avatarUrl = `/uploads/avatars/${file.filename}`;
    return this.users.setAvatarUrl(Number(id), avatarUrl);
  }

  // ==========================
  // Upload Signature
  // ==========================
  @Roles('system_admin', 'hr_admin')
  @Post(':id/signature')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/signatures',
        filename: (req, file, cb) => {
          const userId = req.params.id;
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `sig-${userId}-${unique}${ext}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async uploadSignature(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');

    const ext = safeImageExt(file.originalname);
    if (!ext) throw new BadRequestException('Only png/jpg/jpeg/webp allowed');

    const signatureUrl = `/uploads/signatures/${file.filename}`;
    return this.users.setSignatureUrl(Number(id), signatureUrl);
  }
}
