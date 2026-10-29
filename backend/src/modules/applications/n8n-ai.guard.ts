import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

@Injectable()
export class N8nAiGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const expected = this.config.get<string>('N8N_AI_KEY') || this.config.get<string>('N8N_INTAKE_KEY') || '';
    const supplied = context.switchToHttp().getRequest().headers['x-n8n-ai-key'];
    const digest = (value: string) => createHash('sha256').update(value).digest();
    if (!expected || typeof supplied !== 'string' || !timingSafeEqual(digest(expected), digest(supplied))) {
      throw new UnauthorizedException('n8n AI credential không hợp lệ.');
    }
    return true;
  }
}
