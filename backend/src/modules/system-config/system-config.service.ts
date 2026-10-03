import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SystemConfigService {
  constructor(private readonly configService: ConfigService) {}

  getConfig() {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    const n8nUrl = this.configService.get<string>(
      'N8N_WEBHOOK_URL',
      'http://localhost:5678/webhook',
    );

    return {
      geminiApiKey: geminiKey
        ? `********${geminiKey.slice(-4)}`
        : '',
      n8nWebhookUrl: n8nUrl,
    };
  }

  updateConfig(geminiApiKey?: string, n8nWebhookUrl?: string) {
    // Lưu ý: ConfigService chỉ đọc process.env trong runtime.
    // Bước này trước mắt cập nhật giá trị runtime.
    if (geminiApiKey?.trim()) {
      process.env.GEMINI_API_KEY = geminiApiKey.trim();
    }

    if (n8nWebhookUrl?.trim()) {
      process.env.N8N_WEBHOOK_URL = n8nWebhookUrl.trim();
    }

    return this.getConfig();
  }
}