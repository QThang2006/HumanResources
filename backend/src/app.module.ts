import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import {
  Department,
  User,
  Job,
  Application,
  Interview,
  OnboardingTask,
  Document,
  DocumentChunk,
  TrainingCourse,
  EmployeeTraining,
  PerformanceReview,
  EmployeeMood,
} from './entities';
import { AiModule } from './modules/core/ai/ai.module';
import { AutomationModule } from './modules/core/automation/automation.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';

@Module({
  imports: [
    // 1. Quản lý biến môi trường
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 2. Event Emitter xử lý bất đồng bộ
    EventEmitterModule.forRoot(),

    // 3. Kết nối MySQL với 12 Entity chuẩn (bao gồm DocumentChunk cho Vector DB & RAG)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', 'rootpassword'),
        database: configService.get<string>('DB_DATABASE', 'hr_enterprise_db'),
        entities: [
          Department,
          User,
          Job,
          Application,
          Interview,
          OnboardingTask,
          Document,
          DocumentChunk,
          TrainingCourse,
          EmployeeTraining,
          PerformanceReview,
          EmployeeMood,
        ],
        synchronize: true, // Tự động đồng bộ cấu trúc các bảng khi khởi động (Môi trường Dev)
        logging: ['error', 'warn'],
        charset: 'utf8mb4_unicode_ci',
      }),
    }),

    // 4. Core Shared Modules (AI & Automation)
    AiModule,
    AutomationModule,

    // 5. Các Feature Modules phục vụ Nghiệp vụ
    AuthModule,
    UsersModule,
    JobsModule,
    ApplicationsModule,
    OnboardingModule,
    SystemConfigModule,
  ],
})
export class AppModule {}
