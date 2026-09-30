import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { OnboardingTask } from '../../entities/onboarding-task.entity';
import { EmployeeMood } from '../../entities/employee-mood.entity';
import { Document } from '../../entities/document.entity';
import { EmployeeTraining } from '../../entities/employee-training.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OnboardingTask,
      EmployeeMood,
      Document,
      EmployeeTraining,
    ]),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
