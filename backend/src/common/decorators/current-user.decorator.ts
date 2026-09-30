import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 👤 Custom Decorator trích xuất thông tin người dùng từ JWT Token
 * Sử dụng: @CurrentUser() user: any hoặc @CurrentUser('id') userId: number
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return null;
    return data ? user[data] : user;
  },
);
