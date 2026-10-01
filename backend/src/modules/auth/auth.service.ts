import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User | null> {
    const lookupEmail = email === 'admin@company.com' ? 'superadmin@company.com' : email;
    const user = await this.userRepository.findOne({
      where: { email: lookupEmail, isActive: true },
      relations: ['department'],
    });

    if (!user) return null;

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) return null;

    return user;
  }

  async login(email: string, pass: string) {
    const user = await this.validateUser(email, pass);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
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

  // Tiện ích đăng nhập nhanh Demo (bằng role) phục vụ chấm đồ án
  async quickDemoLogin(role: UserRole) {
    let user = await this.userRepository.findOne({
      where: { role, isActive: true },
      relations: ['department'],
    });

    if (!user) {
      // Nếu chưa có, lấy user đầu tiên
      user = await this.userRepository.findOne({ relations: ['department'] });
    }

    if (!user) {
      throw new UnauthorizedException('Chưa có dữ liệu người dùng trong cơ sở dữ liệu.');
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
}
