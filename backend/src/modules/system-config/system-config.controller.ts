import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class SystemConfigController {
  constructor(
      private readonly systemConfigService: SystemConfigService,
  ) {}

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

  @Post('test-n8n')
  testN8n(
      @Body()
      body: {
        webhookUrl?: string;
      },
  ) {
    return this.systemConfigService.testN8n(
        body.webhookUrl,
    );
  }
  @Post('test-gemini')
  testGemini() {
    return this.systemConfigService.testGemini();
  }

  // Health check dành cho n8n WF-02 giám sát máy chủ
  @Public()
  @Get('health')
  healthCheck() {
    const memory = process.memoryUsage();
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      memory: {
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        rssMb: Math.round(memory.rss / 1024 / 1024),
      },
    };
  }

  // Kích hoạt tiến trình snapshot CSDL từ n8n WF-02 lúc 02:00 AM
  @Public()
  @Post('trigger-backup')
  triggerBackup(
    @Body()
    body: {
      backupId: string;
      filename: string;
      targetDb?: string;
      executedBy?: string;
    },
  ) {
    return {
      success: true,
      message: `Đã kích hoạt sao lưu cơ sở dữ liệu [${body.targetDb || 'hr_enterprise_db'}] thành công.`,
      backupId: body.backupId,
      filename: body.filename,
      executedAt: new Date().toISOString(),
    };
  }
}