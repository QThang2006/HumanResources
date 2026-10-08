import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';

@Injectable()
export class SubmitRateGuard implements CanActivate {
  private readonly windows = new Map<string, { start: number; count: number }>();

  canActivate(context: ExecutionContext) {
    const now = Date.now();
    for (const [key, window] of this.windows)
      if (now - window.start >= 60000) this.windows.delete(key);
    const request = context.switchToHttp().getRequest();
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const window = this.windows.get(key) || { start: now, count: 0 };
    if (window.count >= 10 || (!this.windows.has(key) && this.windows.size >= 10000))
      throw new HttpException('Quá nhiều lần nộp hồ sơ. Hãy thử lại sau một phút.', 429);
    window.count++;
    this.windows.set(key, window);
    return true;
  }
}
