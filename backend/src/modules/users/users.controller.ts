import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { UserRole } from '../../entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =========================================================
  // DANH SÁCH NGƯỜI DÙNG
  // SUPERADMIN và HR được xem
  // =========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.HR)
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  // =========================================================
  // DANH SÁCH PHÒNG BAN
  // Dùng cho dropdown chỉnh sửa phòng ban ở Admin
  // =========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Get('departments')
  async getDepartments() {
    return this.usersService.getDepartments();
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Post('departments')
  async createDepartment(
      @Body()
      body: {
        name: string;
        code: string;
        description?: string;
      },
  ) {
    return this.usersService.createDepartment(body);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Post()
  async createUser(
      @Body()
      body: {
        fullName: string;
        email: string;
        password: string;
        phone?: string;
        jobTitle?: string;
        departmentId?: number;
        role: UserRole;
      },
  ) {
    return this.usersService.createUser(body);
  }
  // =========================================================
  // CẬP NHẬT USER
  // Phòng ban / Chức danh / Vai trò / Trạng thái
  // =========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Patch(':id')
  async updateUser(
      @Param('id', ParseIntPipe) id: number,
      @Body()
      body: {
        departmentId?: number;
        jobTitle?: string;
        role?: UserRole;
        isActive?: boolean;
      },
  ) {
    return this.usersService.updateUser(id, body);
  }

  // =========================================================
  // ĐỔI VAI TRÒ
  // Giữ lại API cũ để không ảnh hưởng frontend hiện tại
  // =========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Patch(':id/role')
  async updateRole(
      @Param('id', ParseIntPipe) id: number,
      @Body('role') role: UserRole,
  ) {
    return this.usersService.updateRole(id, role);
  }

  // =========================================================
  // XÓA VĨNH VIỄN USER
  // Không cho tự xóa tài khoản đang đăng nhập
  // =========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Delete(':id')
  async deleteUser(
      @Param('id', ParseIntPipe) id: number,
      @CurrentUser('id') currentUserId: number,
  ) {
    return this.usersService.deleteUser(id, currentUserId);
  }

  // =========================================================
  // SEED TÀI KHOẢN DEMO
  // Giữ nguyên chức năng cũ
  // =========================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @Post('seed')
  async seedDemoUsers() {
    return this.usersService.seedInitialData();
  }
}
