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
  ) { }

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

  async login(
    email: string,
    pass: string,
    clientIp?: string,
    userAgent?: string,
  ) {
    // 1. Kiểm tra xem IP có đang bị phong tỏa tạm thời bởi n8n không
    if (clientIp && this.isIpBlocked(clientIp)) {
      const banInfo = this.blockedIps.get(clientIp);
      throw new UnauthorizedException(
        `Địa chỉ IP [${clientIp}] đang bị phong tỏa tạm thời đến ${banInfo?.banUntil.toLocaleTimeString('vi-VN')} do phát hiện nghi vấn dò quét mật khẩu.`,
      );
    }

    const user = await this.validateUser(email, pass);

    // Sai email hoặc sai mật khẩu
    if (!user) {
      const targetIp = clientIp || '127.0.0.1';
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // Khung trượt 15 phút

      const currentRecord = this.loginAttempts.get(targetIp) || { count: 0, firstAttempt: now };
      if (now - currentRecord.firstAttempt > windowMs) {
        currentRecord.count = 1;
        currentRecord.firstAttempt = now;
      } else {
        currentRecord.count++;
      }
      this.loginAttempts.set(targetIp, currentRecord);

      // Bắn security alert sang n8n WF-01 bất đồng bộ kèm số lần thử sai lũy kế
      this.dispatchSecurityAlertToN8n({
        ip: targetIp,
        email,
        userAgent: userAgent || 'Unknown-Browser',
        reason: 'LOGIN_FAILED_CREDENTIALS_MISMATCH',
        failedAttempts: currentRecord.count,
        timestamp: new Date().toISOString(),
      });

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

  // Bộ đếm số lần đăng nhập sai theo IP (Rate Limiter In-memory: IP -> { count, firstAttempt })
  private loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

  // Danh sách IP bị phong tỏa tạm thời (In-memory IP Blacklist)
  private blockedIps = new Map<string, { banUntil: Date; reason: string; incidentId: string }>();

  async blockIp(
    ip: string,
    durationMinutes: number = 60,
    incidentId?: string,
    reason?: string,
    email?: string,
    failedAttempts?: number,
  ) {
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
      email: email || 'quocthangngo2006@gmail.com',
      failedAttempts: failedAttempts || 5,
      banMinutes: durationMinutes,
      banUntil,
      incidentId: incidentId || `INC-BRUTE-${Date.now().toString(36).toUpperCase()}`,
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

  // Bắn webhook thông báo đăng nhập sai sang n8n WF-01 Brute-force Defense
  private dispatchSecurityAlertToN8n(payload: any) {
    const baseUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';
    const webhookUrl = `${baseUrl.replace(/\/$/, '')}/security-alert`;
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify(payload),
    }).catch(() => {
      // Bỏ qua lỗi kết nối n8n để không làm chậm luồng người dùng
    });
  }
}