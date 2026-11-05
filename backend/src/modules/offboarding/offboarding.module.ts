import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationSecretGuard } from '../../common/guards/automation-secret.guard';
import { OffboardingCase, User } from '../../entities';
import { OffboardingAutomationController } from './offboarding-automation.controller';
import { OffboardingController } from './offboarding.controller';
import { OffboardingService } from './offboarding.service';

@Module({
  imports: [TypeOrmModule.forFeature([OffboardingCase, User])],
  controllers: [OffboardingController, OffboardingAutomationController],
  providers: [OffboardingService, AutomationSecretGuard],
  exports: [OffboardingService],
})
export class OffboardingModule {}
