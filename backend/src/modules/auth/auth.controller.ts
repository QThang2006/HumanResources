import { Controller, Post, Body, Get, UseGuards, BadRequestException, Ip, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent: string,
  ) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Vui lòng nhập đầy đủ email và mật khẩu.');
    }
    return this.authService.login(body.email, body.password, clientIp, userAgent);
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

  // Endpoint tiếp nhận lệnh cấm IP từ n8n WF-01 Brute-force Defense
  @Post('block-ip')
  blockIp(
    @Body()
    body: {
      ip: string;
      durationMinutes?: number;
      incidentId?: string;
      reason?: string;
    },
  ) {
    if (!body.ip) {
      throw new BadRequestException('Vui lòng cung cấp địa chỉ IP cần khóa.');
    }
    return this.authService.blockIp(
      body.ip,
      body.durationMinutes,
      body.incidentId,
      body.reason,
    );
  }
}
