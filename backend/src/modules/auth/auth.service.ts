import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
      @InjectRepository(User)
      private userRepository: Repository<User>,
      private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const lookupEmail =
        email === 'admin@company.com'
            ? 'superadmin@company.com'
            : email;

    const user = await this.userRepository.findOne({
      where: { email: lookupEmail },
      relations: ['department'],
    });

    // Phải kiểm tra null TRƯỚC khi đọc isActive
    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);

    if (!isMatch) {
      return null;
    }

    return user;
  }

  async login(email: string, pass: string) {
    const user = await this.validateUser(email, pass);

    // Sai email hoặc sai mật khẩu
    if (!user) {
      throw new UnauthorizedException(
          'Email hoặc mật khẩu không chính xác.',
      );
    }

    // Đến đây chắc chắn user không còn null
    if (user.isActive === false) {
      throw new UnauthorizedException(
          'Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị viên.',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department?.name || 'Khối Chung',
        jobTitle: user.jobTitle,
      },
    };
  }

  // Danh sách IP bị phong tỏa tạm thời (In-memory IP Blacklist)
  private blockedIps = new Map<string, { banUntil: Date; reason: string; incidentId: string }>();

  async blockIp(ip: string, durationMinutes: number = 60, incidentId?: string, reason?: string) {
    const banUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    this.blockedIps.set(ip, {
      banUntil,
      reason: reason || 'Brute-force limit exceeded',
      incidentId: incidentId || 'N/A',
    });
    return {
      success: true,
      message: `Đã tạm khóa địa chỉ IP [${ip}] trong ${durationMinutes} phút.`,
      ip,
      banUntil,
      incidentId,
    };
  }

  isIpBlocked(ip: string): boolean {
    const record = this.blockedIps.get(ip);
    if (!record) return false;
    if (new Date() > record.banUntil) {
      this.blockedIps.delete(ip);
      return false;
    }
    return true;
  }
}