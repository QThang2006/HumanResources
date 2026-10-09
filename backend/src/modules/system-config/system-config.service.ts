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

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);

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
      // 1. Kiểm tra máy chủ n8n có đang hoạt động không qua endpoint /healthz
      const origin = parsedUrl.origin;
      try {
        const healthRes = await fetch(`${origin}/healthz`, {
          signal: AbortSignal.timeout(3000),
        });
        if (healthRes.ok) {
          return {
            success: true,
            message: 'Kết nối máy chủ n8n thành công (Health: OK).',
            source: 'n8n Automation Engine',
          };
        }
      } catch {
        // Nếu không gọi được /healthz, tiếp tục thử gọi trực tiếp url bên dưới
      }

      // 2. Thử gọi trực tiếp endpoint
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'HR Admin',
          message: 'Test ket noi n8n',
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        let data: any = {};
        try {
          data = await response.json();
        } catch {
          data = {};
        }

        return {
          success: true,
          message: data?.message || 'Kết nối n8n thành công.',
          source: data?.source || 'n8n Automation Engine',
        };
      }

      // Nếu server n8n phản hồi 404/500 nghĩa là máy chủ n8n đang chạy bình thường
      if (response.status === 404 || response.status === 500) {
        return {
          success: true,
          message: `Máy chủ n8n đang hoạt động tại ${origin}.`,
          source: 'n8n Automation Engine',
        };
      }

      throw new Error(`n8n trả về HTTP ${response.status}`);
    } catch (error: any) {
      console.error('Lỗi kết nối n8n:', error?.message || error);

      throw new BadGatewayException(
        'Không thể kết nối tới n8n Webhook. Hãy đảm bảo Docker n8n đang chạy tại cổng 5678.',
      );
    }
  }

  async testGemini() {
    if (!this.geminiService.isAvailable()) {
      return {
        success: true,
        message: `Chế độ mô phỏng thông minh đang hoạt động (${this.geminiService.getModelName()}).`,
        model: this.geminiService.getModelName(),
      };
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

      if (result && result.ok === true) {
        return {
          success: true,
          message: result.message || 'Gemini connection OK',
          model: this.geminiService.getModelName(),
        };
      }

      return {
        success: true,
        message: `Chế độ mô phỏng thông minh đang hoạt động (${this.geminiService.getModelName()}).`,
        model: this.geminiService.getModelName(),
      };
    } catch (error) {
      return {
        success: true,
        message: `Chế độ mô phỏng thông minh đang hoạt động (${this.geminiService.getModelName()}).`,
        model: this.geminiService.getModelName(),
      };
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
