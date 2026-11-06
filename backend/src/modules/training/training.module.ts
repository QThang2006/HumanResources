import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../core/ai/ai.module';

import { TrainingCourse } from '../../entities/training-course.entity';
import { EmployeeTraining } from '../../entities/employee-training.entity';
import { User } from '../../entities/user.entity';
import { PerformanceReview } from '../../entities/performance-review.entity';
import { PerformanceReviewReminder } from '../../entities/performance-review-reminder.entity';

import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';
import { TrainingAutomationController } from './training-automation.controller';
import { AutomationSecretGuard } from '../../common/guards/automation-secret.guard';
import { PerformanceReviewService } from './performance-review.service';
import { PerformanceReviewController } from './performance-review.controller';
import { PerformanceReviewSchedule } from './performance-review-schedule.entity';
import { ReviewCalendarService } from './review-calendar.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            TrainingCourse,
            EmployeeTraining,
            User,
            PerformanceReview,
            PerformanceReviewReminder,
            PerformanceReviewSchedule,
        ]),
        AiModule,
    ],
    controllers: [
        TrainingController,
        TrainingAutomationController,
        PerformanceReviewController,
    ],
    providers: [TrainingService, PerformanceReviewService, ReviewCalendarService, AutomationSecretGuard],
    exports: [TrainingService],
})
export class TrainingModule {}
