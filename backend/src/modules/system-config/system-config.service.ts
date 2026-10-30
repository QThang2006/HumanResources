import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { GeminiService } from '../core/ai/gemini.service';
import { VectorService } from '../core/ai/vector.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SystemConfigService {
  constructor(
      private readonly configService: ConfigService,
      private readonly geminiService: GeminiService,
      @Optional() private readonly vectorService?: VectorService,
  ) {}

  getConfig() {
    const geminiKey = process.env.GEMINI_API_KEY || '';
    const n8nUrl =
        process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';

    return {
      geminiApiKey: geminiKey && geminiKey !== 'your_gemini_api_key_here' &&
          !/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(geminiKey.trim())
          ? `********${geminiKey.slice(-4)}`
          : '',
      n8nWebhookUrl: n8nUrl,
    };
  }

  updateConfig(geminiApiKey?: string, n8nWebhookUrl?: string) {
    const envPath = path.join(process.cwd(), '.env');
    // Không ghi đè API Key thật bằng chuỗi đã được che ********xxxx
    const nextKey = geminiApiKey?.trim() && !geminiApiKey.trim().startsWith('********')
        ? geminiApiKey.trim()
        : undefined;
    const nextWebhookUrl = n8nWebhookUrl?.trim() || undefined;

    if (nextKey) {
      if (/[\r\n]/.test(geminiApiKey)) {
        throw new BadRequestException('Khóa Gemini phải nằm trên một dòng, không được chứa ký tự xuống dòng.');
      }
      if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(nextKey)) {
        throw new BadRequestException('Ô Gemini API Key cần chuỗi khóa API Gemini, không phải đường dẫn website hoặc địa chỉ n8n. Hãy nhập khóa API thật rồi lưu lại.');
      }
    }

    if (nextWebhookUrl) {
      try {
        const parsedUrl = new URL(nextWebhookUrl);

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
    }

    let envContent = fs.existsSync(envPath)
        ? fs.readFileSync(envPath, 'utf8')
        : '';
    if (nextKey) {
      envContent = this.setEnvValue(envContent, 'GEMINI_API_KEY', nextKey);
    }
    if (nextWebhookUrl) {
      envContent = this.setEnvValue(
          envContent,
          'N8N_WEBHOOK_URL',
          nextWebhookUrl,
      );
    }

    fs.writeFileSync(envPath, envContent, 'utf8');

    // Chỉ cập nhật runtime sau khi toàn bộ cấu hình đã hợp lệ và lưu thành công.
    if (nextWebhookUrl) process.env.N8N_WEBHOOK_URL = nextWebhookUrl;
    if (nextKey) {
      process.env.GEMINI_API_KEY = nextKey;
      this.geminiService.refreshConfiguration();
      this.vectorService?.refreshConfiguration();
    }

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
        success: false,
        message: 'Chưa cấu hình khóa Gemini hợp lệ cho backend. Hãy nhập khóa API, lưu cấu hình rồi kiểm tra lại. Khóa trong credential n8n không tự áp dụng cho backend.',
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
        success: false,
        message: 'Gemini chưa trả về kết quả kiểm tra hợp lệ. Hãy kiểm tra khóa API, hạn mức và kết nối mạng rồi thử lại.',
        model: this.geminiService.getModelName(),
      };
    } catch {
      return {
        success: false,
        message: 'Không thể kết nối Gemini. Hãy kiểm tra khóa API, hạn mức và kết nối mạng rồi thử lại.',
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
