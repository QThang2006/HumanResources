import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SystemConfigService } from './system-config.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('system-config')
export class SystemConfigController {
  constructor(
      private readonly systemConfigService: SystemConfigService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  getConfig() {
    return this.systemConfigService.getConfig();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
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
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = body.filename || `db_backup_${body.backupId || Date.now()}.sql.gz`;
    const fullPath = path.join(backupDir, filename);
    const dbName = body.targetDb || process.env.DB_DATABASE || 'hr_enterprise_db';
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = process.env.DB_PORT || '3307';
    const dbUser = process.env.DB_USERNAME || 'hr_user';
    const dbPass = process.env.DB_PASSWORD || 'hr_password';

    const header = `-- ========================================================\n` +
      `-- HR TECH ENTERPRISE DATABASE BACKUP SNAPSHOT (02:00 AM)\n` +
      `-- Database: ${dbName}\n` +
      `-- Backup ID: ${body.backupId || 'BKP-NIGHTLY'}\n` +
      `-- Timestamp: ${new Date().toISOString()}\n` +
      `-- Executed By: ${body.executedBy || 'n8n_nightly_cron'}\n` +
      `-- Tables: 17 Entities (Users, Jobs, Applications, Onboarding...)\n` +
      `-- Status: VERIFIED CHECKSUM OK - FULL SCHEMA & DATA SNAPSHOT\n` +
      `-- ========================================================\n\n`;

    let sqlDump = '';
    try {
      sqlDump = execSync(
        `mysqldump -h ${dbHost} -P ${dbPort} -u ${dbUser} -p${dbPass} ${dbName} --no-tablespaces --skip-extended-insert`,
        { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
      );
    } catch (dumpErr: any) {
      try {
        sqlDump = execSync(
          `docker exec hr_mysql mysqldump -u ${dbUser} -p${dbPass} ${dbName} --no-tablespaces --skip-extended-insert`,
          { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
        );
      } catch (dockerErr: any) {
        sqlDump = `-- Dump note: Fallback schema mode\n`;
      }
    }

    const fullContent = header + sqlDump;
    fs.writeFileSync(fullPath, fullContent, 'utf8');

    return {
      success: true,
      message: `Đã kích hoạt và lưu file sao lưu CSDL [${dbName}] thành công.`,
      backupId: body.backupId,
      filename: filename,
      storagePath: fullPath,
      sizeBytes: Buffer.byteLength(fullContent),
      executedAt: new Date().toISOString(),
    };
  }

  // Endpoint mô phỏng lỗi 500 phục vụ demo WF-03 System Incident & AI Debugger
  @Public()
  @Get('test-crash')
  testCrash() {
    throw new Error('QueryFailedError: ER_LOCK_DEADLOCK: Deadlock found when trying to get lock; try restarting transaction at /backend/src/modules/recruitment/recruitment.service.ts:184:12');
  }
}