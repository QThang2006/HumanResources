import { Controller, Get, Patch, Post, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Lấy danh sách toàn bộ nhân sự (Dành cho HR & SUPERADMIN quản trị)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.HR)
  @Get()
  async getAllUsers() {
    return this.usersService.findAll();
  }

  // API ĐỔI ROLE CỦA NHÂN VIÊN: Chỉ có duy nhất SUPERADMIN mới có quyền gọi API này!
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Patch(':id/role')
  async changeUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(id, dto.role);
  }

  // Khởi tạo tài khoản mẫu nhanh
  @Post('seed')
  async seedDemoUsers() {
    return this.usersService.seedInitialData();
  }
}
