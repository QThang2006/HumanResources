import { CvScoreQueueService } from './cv-score-queue.service';
import { ApplicationAcknowledgementService } from './application-acknowledgement.service';
import { IntakeController, IntakeGuard } from './intake.controller';
import { N8nAiController } from './n8n-ai.controller';
import { N8nAiGuard } from './n8n-ai.guard';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { Application } from '../../entities/application.entity';
import { Job } from '../../entities/job.entity';
import { Interview } from '../../entities/interview.entity';
import { User } from '../../entities/user.entity';
import { OnboardingTask } from '../../entities/onboarding-task.entity';
import { TrainingCourse } from '../../entities/training-course.entity';
import { EmployeeTraining } from '../../entities/employee-training.entity';
import { JobsModule } from '../jobs/jobs.module';
import { CvStorageService } from './cv-storage.service';
import { SubmitRateGuard } from './submit-rate.guard';
import { InterviewDelivery } from './interview-delivery.entity';
import { InterviewDeliveryService } from './interview-delivery.service';
import { Offer } from '../../entities/offer.entity';
import { OfferService } from './offer.service';
import { OfferController } from './offer.controller';
import {
  InterviewScheduleController,
  InterviewScheduleService,
} from './interview-schedule.controller';

@Module({
  imports: [
    JobsModule,
    TypeOrmModule.forFeature([
      Application,
      Job,
      Interview,
      InterviewDelivery,
      User,
      OnboardingTask,
      TrainingCourse,
      EmployeeTraining,
      Offer,
    ]),
  ],
  controllers: [IntakeController, ApplicationsController, N8nAiController, InterviewScheduleController, OfferController],
  providers: [
    ApplicationAcknowledgementService,
    CvScoreQueueService,
    ApplicationsService,
    CvStorageService,
    SubmitRateGuard,
    InterviewDeliveryService,
    InterviewScheduleService,
    OfferService,
    IntakeGuard,
    N8nAiGuard,
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
