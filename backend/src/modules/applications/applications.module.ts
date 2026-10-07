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
import { InterviewScheduleController, InterviewScheduleService } from './interview-schedule.controller';

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
    ]),
  ],
  controllers: [ApplicationsController, InterviewScheduleController],
  providers: [ApplicationsService, CvStorageService, SubmitRateGuard, InterviewDeliveryService, InterviewScheduleService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
