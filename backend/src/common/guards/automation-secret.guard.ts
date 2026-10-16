import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

@Injectable()
export class AutomationSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('N8N_AUTOMATION_SECRET')?.trim();
    if (!expected) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình khóa bảo mật cho quy trình tự động.',
      );
    }

    const value = context.switchToHttp().getRequest().headers['x-automation-secret'];
    const supplied = (Array.isArray(value) ? value[0] : value || '').trim();
    const expectedHash = createHash('sha256').update(expected).digest();
    const suppliedHash = createHash('sha256').update(supplied).digest();

    if (!supplied || !timingSafeEqual(expectedHash, suppliedHash)) {
      throw new UnauthorizedException('Quy trình tự động chưa được xác thực.');
    }

    return true;
  }
}
