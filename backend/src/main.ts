import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Kích hoạt CORS cho React Frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });

  // Tiền tố toàn cục cho API
  app.setGlobalPrefix('api');

  // 1. Tầng Chuẩn Hóa Lỗi Toàn Cục (Global Exception Filter)
  app.useGlobalFilters(new HttpExceptionFilter());

  // 2. Tầng Biến Đổi & Đo Đạc Hiệu Năng (Global Interceptors)
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // 3. Tầng Kiểm Tra Tính Hợp Lệ Dữ Liệu Đầu Vào (DTO Validation Pipe)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`🚀 HR Enterprise Backend đang chạy tại: http://localhost:${port}/api`);
}
bootstrap();
