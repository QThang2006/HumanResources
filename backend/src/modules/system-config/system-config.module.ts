import { Module } from '@nestjs/common';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';
import { AutomationSecretGuard } from '../../common/guards/automation-secret.guard';

@Module({
  controllers: [SystemConfigController],
  providers: [SystemConfigService, AutomationSecretGuard],
})
export class SystemConfigModule {}
