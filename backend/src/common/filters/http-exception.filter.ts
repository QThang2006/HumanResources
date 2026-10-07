import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 🛡️ Chuẩn hóa toàn bộ phản hồi lỗi trong hệ thống (Enterprise Error Response)
 * Không để lộ thông tin nhạy cảm của máy chủ ra client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: any = 'Lỗi máy chủ nội bộ (Internal Server Error)';
    let errorDetail: any = null;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resObj = exceptionResponse as Record<string, any>;
      message = resObj.message || message;
      errorDetail = resObj.error || null;
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const sanitizedMessage = this.sanitize(message);

    const errorPayload = {
      success: false,
      statusCode: status,
      message: Array.isArray(sanitizedMessage) ? sanitizedMessage[0] : sanitizedMessage,
      errors: Array.isArray(sanitizedMessage) ? sanitizedMessage : undefined,
      error: this.sanitize(errorDetail),
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - Status: ${status} - Error: ${JSON.stringify(sanitizedMessage)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`[${request.method}] ${request.url} - Status: ${status} - Message: ${JSON.stringify(sanitizedMessage)}`);
    }

    response.status(status).json(errorPayload);
  }

  /**
   * 🛡️ Khử sạch dữ liệu nhạy cảm (Sanitization) trước khi ghi log hoặc trả về client
   */
  private sanitize(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const sensitiveKeys = [
      'password',
      'passwordhash',
      'temppassword',
      'token',
      'accesstoken',
      'refreshtoken',
      'apikey',
      'secret',
      'clientsecret',
      'authorization',
      'cookie',
    ];

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '****** [REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
