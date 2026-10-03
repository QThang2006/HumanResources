import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  getConfig() {
    return this.systemConfigService.getConfig();
  }

  @Patch()
  updateConfig(
    @Body()
    body: {
      geminiApiKey?: string;
      n8nWebhookUrl?: string;
    },
  ) {
    return this.systemConfigService.updateConfig(
      body.geminiApiKey,
      body.n8nWebhookUrl,
    );
  }
}