import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SystemConfigService {
  constructor(private readonly configService: ConfigService) {}

  getConfig() {
    const geminiKey = process.env.GEMINI_API_KEY || '';
    const n8nUrl =
        process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

    return {
      geminiApiKey: geminiKey
          ? `********${geminiKey.slice(-4)}`
          : '',
      n8nWebhookUrl: n8nUrl,
    };
  }

  updateConfig(geminiApiKey?: string, n8nWebhookUrl?: string) {
    const envPath = path.join(process.cwd(), '.env');

    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Không ghi đè API Key thật bằng chuỗi đã được che ********xxxx
    if (
        geminiApiKey?.trim() &&
        !geminiApiKey.trim().startsWith('********')
    ) {
      const value = geminiApiKey.trim();

      process.env.GEMINI_API_KEY = value;
      envContent = this.setEnvValue(
          envContent,
          'GEMINI_API_KEY',
          value,
      );
    }

    if (n8nWebhookUrl?.trim()) {
      const value = n8nWebhookUrl.trim();
      try {
        const parsedUrl = new URL(value);

        if (
            parsedUrl.protocol !== 'http:' &&
            parsedUrl.protocol !== 'https:'
        ) {
          throw new Error();
        }
      } catch {
        throw new BadRequestException(
            'n8n Webhook URL phải là địa chỉ HTTP hoặc HTTPS hợp lệ.',
        );
      }

      process.env.N8N_WEBHOOK_URL = value;
      envContent = this.setEnvValue(
          envContent,
          'N8N_WEBHOOK_URL',
          value,
      );
    }

    fs.writeFileSync(envPath, envContent, 'utf8');

    return this.getConfig();
  }

  private setEnvValue(
      envContent: string,
      key: string,
      value: string,
  ): string {
    const line = `${key}=${value}`;
    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(envContent)) {
      return envContent.replace(regex, line);
    }

    const separator =
        envContent.length > 0 && !envContent.endsWith('\n')
            ? '\n'
            : '';

    return `${envContent}${separator}${line}\n`;
  }
}