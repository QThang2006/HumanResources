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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      Job,
      Interview,
      User,
      OnboardingTask,
      TrainingCourse,
      EmployeeTraining,
    ]),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
