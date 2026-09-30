import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    if (body.email && body.password) {
      return this.authService.login(body.email, body.password);
    }
    if (body.role) {
      return this.authService.quickDemoLogin(body.role);
    }
    return this.authService.login(body.email, body.password || 'admin123');
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department?.name || 'Khối Chung',
      jobTitle: user.jobTitle,
    };
  }

  @Post('logout')
  logout() {
    return {
      success: true,
      message: 'Đăng xuất phiên làm việc thành công.',
    };
  }
}
