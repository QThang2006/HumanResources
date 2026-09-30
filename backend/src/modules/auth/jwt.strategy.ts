import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'hr_super_secret_jwt_key_2026'),
    });
  }

  async validate(payload: { sub: number; email: string; role: string }) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
      relations: ['department'],
    });

    if (!user) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị khóa.');
    }

    return user;
  }
}
