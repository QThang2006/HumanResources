import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { GeminiService } from '../core/ai/gemini.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SystemConfigService {
  constructor(
      private readonly configService: ConfigService,
      private readonly geminiService: GeminiService,
  ) {}

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
  async testN8n(webhookUrl?: string) {
    const url =
        webhookUrl?.trim() ||
        process.env.N8N_WEBHOOK_URL?.trim();

    if (!url) {
      throw new BadRequestException(
          'Chưa cấu hình n8n Webhook Endpoint.',
      );
    }

    try {
      const parsedUrl = new URL(url);

      if (
          parsedUrl.protocol !== 'http:' &&
          parsedUrl.protocol !== 'https:'
      ) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new BadRequestException(
          'n8n Webhook URL không hợp lệ.',
      );
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'HR Admin',
          message: 'Test ket noi n8n',
        }),
      });

      if (!response.ok) {
        throw new Error(
            `n8n trả về HTTP ${response.status}`,
        );
      }

      const data = await response.json();

      return {
        success: true,
        message:
            data?.message || 'Kết nối n8n thành công.',
        source:
            data?.source || 'n8n Automation Engine',
      };
    } catch (error) {
      console.error('Lỗi kết nối n8n:', error);

      throw new BadGatewayException(
          'Không thể kết nối tới n8n Webhook.',
      );
    }
  }
  async testGemini() {
    if (!this.geminiService.isAvailable()) {
      throw new BadGatewayException(
          'Gemini chưa được khởi tạo. Hãy kiểm tra GEMINI_API_KEY và khởi động lại Backend.',
      );
    }

    try {
      const result = await this.geminiService.generateJson<{
        ok: boolean;
        message: string;
      }>(
          `
Hãy kiểm tra kết nối dịch vụ AI.

BẮT BUỘC chỉ trả về JSON:
{
  "ok": true,
  "message": "Gemini connection OK"
}
      `.trim(),
      );

      if (!result || result.ok !== true) {
        throw new Error('Gemini không trả về kết quả hợp lệ.');
      }

      return {
        success: true,
        message: result.message || 'Gemini connection OK',
        model: this.geminiService.getModelName(),
      };
    } catch (error) {
      console.error('Lỗi kiểm tra Gemini:', error);

      throw new BadGatewayException(
          'Không thể kết nối tới Google Gemini AI.',
      );
    }
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
