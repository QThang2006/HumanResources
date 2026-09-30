import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 🔓 Decorator đánh dấu endpoint là Public (không yêu cầu Bearer JWT token)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
